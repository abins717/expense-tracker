import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { push, onValue, ref, remove, set, update } from 'firebase/database';
import { auth, database, googleProvider } from './firebase';

import BalanceCounter from './components/BalanceCounter';
import PremiumModal from './components/PremiumModal';
import HistoryTimeline from './components/HistoryTimeline';
import SettingsTab, { CURRENCIES } from './components/SettingsTab';
import StatusTab from './components/StatusTab';
import TransactionForm from './components/TransactionForm';

import {
  DEFAULT_CATEGORIES,
  normalizeCategoryName,
  isRemovedCategory,
  isDefaultCategory,
  uniqueCategories,
} from './utils/categories';

const formatDate = (date) => date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const isGuest = (u) => u?.uid?.startsWith('guest-');
const guestExpensesKey = (uid) => `guest_expenses_${uid}`;
const guestSettingsKey = (uid) => `guest_settings_${uid}`;

// Helper: read-modify-write guest settings in one place
const updateGuestSettings = (uid, updater) => {
  const stored = localStorage.getItem(guestSettingsKey(uid)) || '{}';
  const obj = JSON.parse(stored);
  updater(obj);
  localStorage.setItem(guestSettingsKey(uid), JSON.stringify(obj));
};

// Helper: read-modify-write guest expenses in one place
const updateGuestExpenses = (uid, updater) => {
  const stored = localStorage.getItem(guestExpensesKey(uid)) || '{}';
  const obj = JSON.parse(stored);
  updater(obj);
  localStorage.setItem(guestExpensesKey(uid), JSON.stringify(obj));
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [activeTab, setActiveTab] = useState('status');
  const [currency, setCurrency] = useState(() => localStorage.getItem('app_currency') || 'INR');
  const [defaultTxType, setDefaultTxType] = useState(() => localStorage.getItem('app_default_tx_type') || 'expense');
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('app_display_name') || '');
  const [modal, setModal] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null); // ← edit state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser((prev) => {
        if (prev && isGuest(prev)) return prev;
        return currentUser;
      });
      if (!currentUser) {
        setTransactions([]);
        setCategories(DEFAULT_CATEGORIES);
        setCategoryBudgets({});
      }
      setLoading(false);
    }, (error) => {
      setAuthError(error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
  if (user) {
    setActiveTab('status');
  }
}, [user]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    if (isGuest(user)) {
      const loadMockData = () => {
        const stored = localStorage.getItem(guestExpensesKey(user.uid)) || '{}';
        const data = JSON.parse(stored);
        const items = Object.keys(data).map((key) => ({
          id: key, ...data[key],
          category: normalizeCategoryName(data[key].category),
        }));
        items.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(items);
        setDataLoading(false);
      };
      loadMockData();
      window.addEventListener('storage', loadMockData);
      window.addEventListener('mock-db-update', loadMockData);
      return () => {
        window.removeEventListener('storage', loadMockData);
        window.removeEventListener('mock-db-update', loadMockData);
      };
    }
    const userExpensesRef = ref(database, `expenses/${user.uid}`);
    const unsubscribe = onValue(userExpensesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setTransactions([]); setDataLoading(false); return; }
      const items = Object.keys(data).map((key) => ({
        id: key, ...data[key],
        category: normalizeCategoryName(data[key].category),
      }));
      items.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(items);
      setDataLoading(false);
    }, (error) => { console.error('Database stream error:', error); setDataLoading(false); });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    if (isGuest(user)) {
      const loadMockSettings = () => {
        const stored = localStorage.getItem(guestSettingsKey(user.uid)) || '{}';
        const data = JSON.parse(stored);
        const savedCategories = data.categories || [];
        const nextCategories = uniqueCategories(savedCategories);
        setCategories(nextCategories);
        setCategoryBudgets(data.categoryBudgets || {});
        setDataLoading(false);
      };
      loadMockSettings();
      window.addEventListener('storage', loadMockSettings);
      window.addEventListener('mock-db-update', loadMockSettings);
      return () => {
        window.removeEventListener('storage', loadMockSettings);
        window.removeEventListener('mock-db-update', loadMockSettings);
      };
    }
    const userSettingsRef = ref(database, `users/${user.uid}/settings`);
    const unsubscribe = onValue(userSettingsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const savedCategories = data.categories || [];
      const nextCategories = uniqueCategories(savedCategories);
      setCategories(nextCategories);
      setCategoryBudgets(data.categoryBudgets || {});
      // Restore app-level settings from Firebase for Google users
      if (data.currency)       { setCurrency(data.currency);            localStorage.setItem('app_currency', data.currency); }
      if (data.defaultTxType)  { setDefaultTxType(data.defaultTxType);  localStorage.setItem('app_default_tx_type', data.defaultTxType); }
      if (data.displayName)    { setDisplayName(data.displayName);       localStorage.setItem('app_display_name', data.displayName); }
      const savedHasAllDefaults = DEFAULT_CATEGORIES.every((cat) =>
        savedCategories.some((s) => s.toLowerCase() === cat.toLowerCase())
      );
      if (!savedHasAllDefaults) {
        set(ref(database, `users/${user.uid}/settings/categories`), nextCategories);
      }
    }, (error) => { console.error('Settings stream error:', error); });
    return () => unsubscribe();
  }, [user]);

  const handleSaveTransaction = async (data) => {
    if (isGuest(user)) {
      const stored = localStorage.getItem(guestExpensesKey(user.uid)) || '{}';
      const dataObj = JSON.parse(stored);
      const nextId = data.id || 'mock-exp-' + Math.random().toString(36).substr(2, 9);
      dataObj[nextId] = {
        title: data.title,
        amount: data.amount,
        category: normalizeCategoryName(data.category),
        type: data.type || 'expense',
        timestamp: dataObj[nextId]?.timestamp || (data.date ? new Date(data.date).getTime() : Date.now()),
        dateString: dataObj[nextId]?.dateString || (data.date ? formatDate(new Date(data.date + 'T00:00:00')) : formatDate(new Date())),
        createdAt: dataObj[nextId]?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      localStorage.setItem(guestExpensesKey(user.uid), JSON.stringify(dataObj));
      window.dispatchEvent(new Event('mock-db-update'));

      const expenseTransactions = Object.values(dataObj)
        .filter((item) => item.type !== 'income');

      setModal({
        type: 'success',
        tone: 'emerald',
        title: data.id ? 'Transaction Updated!' : 'Transaction Posted!',
        message: data.id ? 'Your changes have been successfully saved.' : 'Your entry has been recorded in the database.',
        details: {
          title: data.title,
          amount: data.amount,
          type: data.type || 'expense',
          category: normalizeCategoryName(data.category),
        },
        onConfirm: () => setModal(null)
      });
      if (data.id) setEditingTransaction(null);
      setActiveTab('history');
      return;
    }

    try {
      if (data.id) {
        // UPDATE existing
        await update(ref(database, `expenses/${user.uid}/${data.id}`), {
          title: data.title,
          amount: data.amount,
          category: normalizeCategoryName(data.category),
          type: data.type,
          updatedAt: Date.now(),
        });
        setEditingTransaction(null);
        setActiveTab('history');
      } else {
        // CREATE new
        await push(ref(database, `expenses/${user.uid}`), {
          title: data.title,
          amount: data.amount,
          category: normalizeCategoryName(data.category),
          type: data.type || 'expense',
          timestamp: data.date ? new Date(data.date + 'T00:00:00').getTime() : Date.now(),
          dateString: data.date ? formatDate(new Date(data.date + 'T00:00:00')) : formatDate(new Date()),
          createdAt: Date.now(),
        });
        setActiveTab('history');
      }

      // Show success modal
      setModal({
        type: 'success',
        tone: 'emerald',
        title: data.id ? 'Transaction Updated!' : 'Transaction Posted!',
        message: data.id ? 'Your changes have been successfully saved.' : 'Your entry has been recorded in the database.',
        details: {
          title: data.title,
          amount: data.amount,
          type: data.type || 'expense',
          category: normalizeCategoryName(data.category),
        },
        onConfirm: () => setModal(null),
      });
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  };

  // Called from HistoryTimeline — switch to Record tab pre-filled
  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setActiveTab('record');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setActiveTab('history');
  };

  const saveCategories = async (nextCategories) => {
    const normalized = uniqueCategories(nextCategories);
    setCategories(normalized);
    if (isGuest(user)) {
      updateGuestSettings(user.uid, (s) => { s.categories = normalized; });
      window.dispatchEvent(new Event('mock-db-update'));
      return;
    }
    await set(ref(database, `users/${user.uid}/settings/categories`), normalized);
  };

  const handleRequestAddCategory = () => {
    setModal({
      type: 'prompt',
      tone: 'emerald',
      title: 'Create Custom Tag',
      message: 'Add a new category label for your expenses.',
      confirmText: 'Create Tag',
      inputPlaceholder: 'e.g., Shopping, Rent, Travel',
      validate: (val) => {
        const cleanVal = normalizeCategoryName(val);
        if (!cleanVal) return 'Category name cannot be empty.';
        if (isRemovedCategory(cleanVal)) return 'That category is no longer available.';
        if (categories.some((item) => item.toLowerCase() === cleanVal.toLowerCase())) return 'That category already exists.';
        return null;
      },
      onConfirm: async (val) => {
        const cleanLabel = normalizeCategoryName(val);
        try {
          setModal(null);
          await saveCategories([...categories, cleanLabel]);
          setModal({
            type: 'success',
            tone: 'emerald',
            title: 'Category Created!',
            message: `"${cleanLabel}" has been added to your category labels.`,
            onConfirm: () => setModal(null)
          });
        } catch (err) {
          console.error('Error saving category:', err);
        }
      }
    });
  };

  const handleRequestRenameCategory = (oldCategory) => {
    const oldName = normalizeCategoryName(oldCategory);
    setModal({
      type: 'prompt',
      tone: 'indigo',
      title: 'Rename Category Tag',
      message: `Enter the new name for "${oldName}". All existing transactions under this tag will be updated automatically.`,
      confirmText: 'Rename',
      defaultValue: oldName,
      validate: (val) => {
        const cleanVal = normalizeCategoryName(val);
        if (!cleanVal) return 'Category name cannot be empty.';
        if (isRemovedCategory(cleanVal)) return 'That category is no longer available.';
        if (categories.some((item) => item.toLowerCase() === cleanVal.toLowerCase() && item.toLowerCase() !== oldName.toLowerCase())) {
          return 'That category already exists.';
        }
        return null;
      },
      onConfirm: async (val) => {
        const newName = normalizeCategoryName(val);
        if (newName.toLowerCase() === oldName.toLowerCase()) {
          setModal(null);
          return;
        }
        const nextCategories = categories.map((cat) => cat.toLowerCase() === oldName.toLowerCase() ? newName : cat);
        setModal(null);
        setCategories(uniqueCategories(nextCategories));
        if (isGuest(user)) {
          // Update transactions in localStorage
          updateGuestExpenses(user.uid, (obj) => {
            Object.keys(obj).forEach((key) => {
              if (normalizeCategoryName(obj[key].category).toLowerCase() === oldName.toLowerCase())
                obj[key].category = newName;
            });
          });
          updateGuestSettings(user.uid, (s) => { s.categories = uniqueCategories(nextCategories); });
          window.dispatchEvent(new Event('mock-db-update'));
          setModal({
            type: 'success',
            tone: 'emerald',
            title: 'Category Renamed!',
            message: `Successfully renamed "${oldName}" to "${newName}".`,
            onConfirm: () => setModal(null)
          });
          return;
        }
        const updates = {};
        transactions.forEach((t) => {
          if (normalizeCategoryName(t.category).toLowerCase() === oldName.toLowerCase())
            updates[`expenses/${user.uid}/${t.id}/category`] = newName;
        });
        updates[`users/${user.uid}/settings/categories`] = uniqueCategories(nextCategories);
        try {
          await update(ref(database), updates);
          setModal({
            type: 'success',
            tone: 'emerald',
            title: 'Category Renamed!',
            message: `Successfully renamed "${oldName}" to "${newName}".`,
            onConfirm: () => setModal(null)
          });
        } catch (err) {
          console.error('Error renaming category:', err);
        }
      }
    });
  };

  const handleRequestDeleteCategory = (category) => {
    const categoryName = normalizeCategoryName(category);
    if (isDefaultCategory(categoryName)) return;
    const matchingCount = transactions.filter((t) => normalizeCategoryName(t.category).toLowerCase() === categoryName.toLowerCase()).length;
    setModal({
      type: 'confirm',
      tone: 'danger',
      title: `Delete ${categoryName}?`,
      message: `This will permanently remove the "${categoryName}" tag and delete the ${matchingCount} transaction${matchingCount === 1 ? '' : 's'} logged under it.`,
      confirmText: 'Delete Category',
      onConfirm: async () => {
        const nextCategories = categories.filter((item) => item.toLowerCase() !== categoryName.toLowerCase());
        setModal(null);
        setCategories(uniqueCategories(nextCategories));
        if (isGuest(user)) {
          updateGuestExpenses(user.uid, (obj) => {
            Object.keys(obj).forEach((key) => {
              if (normalizeCategoryName(obj[key].category).toLowerCase() === categoryName.toLowerCase())
                delete obj[key];
            });
          });
          updateGuestSettings(user.uid, (s) => { s.categories = uniqueCategories(nextCategories); });
          window.dispatchEvent(new Event('mock-db-update'));
          setModal({
            type: 'success',
            tone: 'emerald',
            title: 'Category Deleted',
            message: `"${categoryName}" and its ${matchingCount} transaction${matchingCount === 1 ? '' : 's'} have been removed.`,
            onConfirm: () => setModal(null)
          });
          return;
        }
        const updates = { [`users/${user.uid}/settings/categories`]: uniqueCategories(nextCategories) };
        transactions.forEach((t) => {
          if (normalizeCategoryName(t.category).toLowerCase() === categoryName.toLowerCase())
            updates[`expenses/${user.uid}/${t.id}`] = null;
        });
        try {
          await update(ref(database), updates);
          setModal({
            type: 'success',
            tone: 'emerald',
            title: 'Category Deleted',
            message: `"${categoryName}" and its ${matchingCount} transaction${matchingCount === 1 ? '' : 's'} have been removed.`,
            onConfirm: () => setModal(null)
          });
        } catch (err) {
          console.error('Error deleting category:', err);
        }
      }
    });
  };

  const handleCategoryBudgetChange = async (category, amount) => {
    const next = { ...categoryBudgets };
    if (!amount || parseFloat(amount) <= 0) {
      delete next[category];
    } else {
      next[category] = parseFloat(amount);
    }
    setCategoryBudgets(next);
    if (isGuest(user)) {
      updateGuestSettings(user.uid, (s) => { s.categoryBudgets = next; });
      window.dispatchEvent(new Event('mock-db-update'));
    } else {
      try {
        await set(ref(database, `users/${user.uid}/settings/categoryBudgets`), next);
      } catch (err) { console.error('Error saving category budgets:', err); }
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    const transaction = transactions.find((t) => t.id === transactionId);
    const amountDisplay = transaction 
      ? ` (₹${parseFloat(transaction.amount).toLocaleString('en-IN')})` 
      : '';

    setModal({
      type: 'confirm',
      tone: 'danger',
      title: 'Delete Transaction?',
      message: `Are you sure you want to permanently remove "${transaction?.title || 'this transaction'}"${amountDisplay}? This action cannot be undone.`,
      confirmText: 'Delete Entry',
      onConfirm: async () => {
        setModal(null);
        if (isGuest(user)) {
          const stored = localStorage.getItem(guestExpensesKey(user.uid)) || '{}';
          const dataObj = JSON.parse(stored);
          delete dataObj[transactionId];
          localStorage.setItem(guestExpensesKey(user.uid), JSON.stringify(dataObj));
          window.dispatchEvent(new Event('mock-db-update'));
          setModal({
            type: 'success',
            tone: 'emerald',
            title: 'Transaction Deleted',
            message: 'The transaction has been removed.',
            onConfirm: () => setModal(null)
          });
          return;
        }
        try {
          await remove(ref(database, `expenses/${user.uid}/${transactionId}`));
          setModal({
            type: 'success',
            tone: 'emerald',
            title: 'Transaction Deleted',
            message: 'The transaction has been removed from database logs.',
            onConfirm: () => setModal(null)
          });
        } catch (err) {
          console.error('Error deleting:', err);
        }
      }
    });
  };

  const handleCurrencyChange = (code) => {
    setCurrency(code);
    localStorage.setItem('app_currency', code);
    if (isGuest(user)) updateGuestSettings(user.uid, (s) => { s.currency = code; });
    else set(ref(database, `users/${user.uid}/settings/currency`), code).catch(console.error);
  };

  const handleDefaultTxTypeChange = (type) => {
    setDefaultTxType(type);
    localStorage.setItem('app_default_tx_type', type);
    if (isGuest(user)) updateGuestSettings(user.uid, (s) => { s.defaultTxType = type; });
    else set(ref(database, `users/${user.uid}/settings/defaultTxType`), type).catch(console.error);
  };

  const handleDisplayNameChange = (name) => {
    setDisplayName(name);
    localStorage.setItem('app_display_name', name);
    if (isGuest(user)) updateGuestSettings(user.uid, (s) => { s.displayName = name; });
    else set(ref(database, `users/${user.uid}/settings/displayName`), name).catch(console.error);
  };

  const handleClearData = () => {
    setModal({
      type: 'confirm',
      tone: 'danger',
      title: 'Clear All Data?',
      message: 'This will permanently delete ALL your transactions. Your categories and settings will be kept. This cannot be undone.',
      confirmText: 'Clear Everything',
      onConfirm: async () => {
        setModal(null);
        if (isGuest(user)) {
          updateGuestExpenses(user.uid, (obj) => { Object.keys(obj).forEach((k) => delete obj[k]); });
          window.dispatchEvent(new Event('mock-db-update'));
        } else {
          try {
            await set(ref(database, `expenses/${user.uid}`), null);
          } catch (err) { console.error('Error clearing data:', err); }
        }
        setModal({
          type: 'success',
          tone: 'emerald',
          title: 'Data Cleared',
          message: 'All transactions have been permanently deleted.',
          onConfirm: () => setModal(null),
        });
      }
    });
  };

  const handleLogin = async () => {
    setAuthError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch (error) { if (error.code !== 'auth/popup-closed-by-user') setAuthError(error.message); }
  };

  const handleMockLogin = () => {
    const existingUid = localStorage.getItem('guest_uid');
    const guestUid = existingUid || ('guest-' + Math.random().toString(36).substr(2, 9));
    if (!existingUid) localStorage.setItem('guest_uid', guestUid);

    // Restore app-level settings from guest's own settings blob
    const guestSettings = JSON.parse(localStorage.getItem(guestSettingsKey(guestUid)) || '{}');
    if (guestSettings.currency)       { setCurrency(guestSettings.currency);           localStorage.setItem('app_currency', guestSettings.currency); }
    if (guestSettings.defaultTxType)  { setDefaultTxType(guestSettings.defaultTxType); localStorage.setItem('app_default_tx_type', guestSettings.defaultTxType); }
    if (guestSettings.displayName)    { setDisplayName(guestSettings.displayName);     localStorage.setItem('app_display_name', guestSettings.displayName); }
    if (guestSettings.categoryBudgets) setCategoryBudgets(guestSettings.categoryBudgets);

    setUser({
      uid: guestUid,
      email: 'guest@local',
      displayName: guestSettings.displayName || 'Guest',
    });
  };

  const handleRequestLogout = () => {
    setModal({
      type: 'confirm',
      tone: 'danger',
      title: 'Sign Out?',
      message: 'Are you sure you want to log out of your account?',
      confirmText: 'Sign Out',
      onConfirm: async () => {
        setModal(null);
        if (user && isGuest(user)) {
          localStorage.removeItem(guestExpensesKey(user.uid));
          localStorage.removeItem(guestSettingsKey(user.uid));
          localStorage.removeItem('guest_uid');
          // Wipe app-level settings so next guest/user starts fresh
          localStorage.removeItem('app_currency');
          localStorage.removeItem('app_default_tx_type');
          localStorage.removeItem('app_display_name');
          setUser(null);
          setTransactions([]);
          setCategories(DEFAULT_CATEGORIES);
          setCategoryBudgets({});
          setCurrency('INR');
          setDefaultTxType('expense');
          setDisplayName('');
          return;
        }
        try { await signOut(auth); } catch (error) { console.error('Error signing out:', error); }
      }
    });
  };

  const groupTransactionsByTimeline = (list) => {
    const groups = { Today: [], Yesterday: [], 'Older Transactions': [] };
    const now = new Date();
    const todayStr = formatDate(now);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    list.forEach((item) => {
      const itemDate = item.timestamp ? formatDate(new Date(item.timestamp)) : item.dateString;
      if (itemDate === todayStr) groups.Today.push(item);
      else if (itemDate === yesterdayStr) groups.Yesterday.push(item);
      else groups['Older Transactions'].push(item);
    });
    return groups;
  };

  const groupedTimelineDataset = useMemo(() => groupTransactionsByTimeline(transactions), [transactions]);
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol || '₹';
  const minDate = transactions.length > 0
    ? new Date(Math.min(...transactions.map((t) => t.timestamp || Date.now()))).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium text-xs">Checking your sign-in...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4 text-emerald-400">
              <span className="text-xl font-bold">₹</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Expense Tracker</h1>
          </div>
          {authError && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <span>⚠</span> {authError}
            </div>
          )}
          <div className="space-y-3">
            <button onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2.5 bg-white text-slate-800 text-sm font-medium py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.99]">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="mx-4 text-[9px] text-slate-600 font-bold uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button onClick={handleMockLogin} id="mock-login-btn"
              className="w-full flex items-center justify-center gap-2 bg-transparent text-emerald-500 text-sm font-medium py-2.5 px-4 rounded-xl border border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all active:scale-[0.99]">
              Continue as Guest / Tester
            </button>

            <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5 mt-1">
              <span className="text-amber-400 text-xs mt-0.5 shrink-0">⚠</span>
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                Guest data is stored locally and will be <span className="font-semibold text-amber-400">permanently deleted</span> on sign out. Use Google sign-in to save your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-stretch font-sans">
      <div className="w-full max-w-md bg-slate-950 border-x border-slate-900 flex flex-col relative pb-24 min-h-screen shadow-2xl">

        <nav className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500/10 border border-emerald-500/30 rounded-md flex items-center justify-center font-bold text-xs text-emerald-400">₹</div>
            <span className="text-sm font-bold tracking-tight text-white">Expense Tracker</span>
          </div>
          <div className="w-6 h-6 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center justify-center font-bold text-[10px] text-emerald-400 cursor-default">
            {(displayName || user?.displayName || 'G').charAt(0).toUpperCase()}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto px-5 py-6">
          {(activeTab === 'status' || activeTab === 'history') && (
            <BalanceCounter transactions={transactions} dataLoading={dataLoading} currencySymbol={currencySymbol} />
          )}

          <div className="w-full mt-6">
            {activeTab === 'status' && (
              <StatusTab
                transactions={transactions}
                categoryBudgets={categoryBudgets}
                categories={categories}
                onCategoryBudgetChange={handleCategoryBudgetChange}
                dataLoading={dataLoading}
                currencySymbol={currencySymbol}
              />
            )}
            {activeTab === 'record' && (
              <TransactionForm
                onSaveTransaction={handleSaveTransaction}
                categories={categories}
                defaultCategories={DEFAULT_CATEGORIES}
                onSaveCategory={handleRequestAddCategory}
                onRenameCategory={handleRequestRenameCategory}
                onDeleteCategory={handleRequestDeleteCategory}
                editingTransaction={editingTransaction}
                onCancelEdit={handleCancelEdit}
                defaultTxType={defaultTxType}
                currencySymbol={currencySymbol}
                transactionsCount={transactions.length}
                minDate={minDate}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTimeline
                groupedTimelineDataset={groupedTimelineDataset}
                transactionsCount={transactions.length}
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={handleEditTransaction}
                currencySymbol={currencySymbol}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                user={user}
                isGuest={isGuest(user)}
                transactions={transactions}
                currency={currency}
                currencySymbol={currencySymbol}
                onCurrencyChange={handleCurrencyChange}
                defaultTxType={defaultTxType}
                onDefaultTxTypeChange={handleDefaultTxTypeChange}
                categories={categories}
                categoryBudgets={categoryBudgets}
                onCategoryBudgetChange={handleCategoryBudgetChange}
                displayName={displayName || user?.displayName || ''}
                onDisplayNameChange={handleDisplayNameChange}
                onClearData={handleClearData}
                onSignOut={handleRequestLogout}
              />
            )}
          </div>
        </main>

        {/* Bottom nav — Record tab badge shows "Editing" when in edit mode */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 border-t border-slate-800/60 backdrop-blur-lg z-50 py-2.5 flex items-center justify-around">
          <button onClick={() => { setActiveTab('status'); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'status' ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span className="text-[10px]">Status</span>
          </button>

          <button onClick={() => setActiveTab('record')}
            className={`flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'record' ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
            {editingTransaction && (
              <span className="absolute -top-1 -right-3 text-[8px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                Editing
              </span>
            )}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px]">{editingTransaction ? 'Edit' : 'Record'}</span>
          </button>

          <button onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px]">History</span>
          </button>

          <button onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px]">Settings</span>
          </button>
        </div>
      </div>

      <PremiumModal modal={modal} onClose={() => setModal(null)} />
    </div>
  );
}
