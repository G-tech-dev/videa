import React, { useEffect, useState } from 'react';
import { FaArrowDown, FaArrowUp, FaMobileAlt, FaSave, FaSpinner, FaWallet } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { walletService } from '../../services/api';
import Loader from '../Common/Loader';

const formatMoney = (value) => `RWF ${Number(value || 0).toLocaleString('en-RW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Wallet = () => {
  const [wallet, setWallet] = useState(null);
  const [formData, setFormData] = useState({ registeredName: '', phoneNumber: '', provider: 'mtn' });
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState('');

  const loadWallet = async () => {
    try {
      const response = await walletService.get();
      const data = response.data.wallet;
      setWallet(data);
      setFormData({ registeredName: data.registeredName || '', phoneNumber: data.phoneNumber || '', provider: data.provider || 'mtn' });
    } catch (error) {
      console.error('Wallet loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWallet(); }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const saveDetails = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await walletService.updateDetails(formData);
      setWallet(response.data.wallet);
      toast.success('Wallet details saved.');
    } catch (error) {
      console.error('Wallet details error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTransaction = async (type) => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 1) {
      toast.error('Enter an amount of at least RWF 1.');
      return;
    }
    if (!formData.registeredName || !formData.phoneNumber) {
      toast.error('Save your registered name and phone number first.');
      return;
    }

    setProcessing(type);
    try {
      const service = type === 'deposit' ? walletService.deposit : walletService.withdraw;
      const response = await service({ amount: numericAmount });
      setWallet(response.data.wallet);
      setAmount('');
      toast.success(type === 'deposit' ? 'Deposit recorded.' : 'Withdrawal requested.');
    } catch (error) {
      console.error(`${type} error:`, error);
    } finally {
      setProcessing('');
    }
  };

  if (loading) return <Loader text="Loading wallet..." />;

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Payments</p>
        <h1 className="mt-1 text-3xl font-bold text-dark-900">My wallet</h1>
        <p className="mt-2 text-dark-600">Manage your mobile money details, deposits, and withdrawals.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-dark-900 p-6 text-white lg:col-span-1">
          <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><FaWallet /></span><span className="text-sm text-dark-300">Available balance</span></div>
          <p className="mt-8 text-3xl font-bold">{formatMoney(wallet?.balance)}</p>
          <p className="mt-2 text-sm text-dark-300">{wallet?.provider?.toUpperCase() || 'MTN'} Mobile Money</p>
        </section>

        <section className="card lg:col-span-2">
          <div className="border-b border-dark-100 px-5 py-4"><h2 className="font-semibold text-dark-900">Wallet details</h2><p className="mt-1 text-sm text-dark-500">Use the name and phone number registered for mobile money.</p></div>
          <form onSubmit={saveDetails} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-medium text-dark-700">Registered name</label><input name="registeredName" value={formData.registeredName} onChange={handleChange} required className="input-field" placeholder="Full registered name" /></div>
            <div><label className="mb-1 block text-sm font-medium text-dark-700">Phone number</label><div className="relative"><FaMobileAlt className="absolute left-3 top-3.5 text-dark-400" /><input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required type="tel" className="input-field pl-10" placeholder="07XXXXXXXX" /></div></div>
            <div><label className="mb-1 block text-sm font-medium text-dark-700">Provider</label><select name="provider" value={formData.provider} onChange={handleChange} className="input-field"><option value="mtn">MTN Mobile Money</option><option value="airtel">Airtel Money</option><option value="other">Other</option></select></div>
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center justify-center gap-2 md:col-span-3 md:justify-self-end">{saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Save wallet details</button>
          </form>
        </section>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold text-dark-900">Deposit or withdraw</h2>
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">To deposit, send mobile money to:</p>
          <p className="mt-1 text-lg font-bold">{wallet?.depositRecipient?.phoneNumber || '0796319967'}</p>
          <p>Registered name: <strong>{wallet?.depositRecipient?.registeredName || 'Uzamukunda Seraphine'}</strong></p>
          <p className="mt-2">Dial <strong>*182#</strong> on MTN Rwanda, choose Send Money, and send the amount to this number. Then enter the same amount below to submit it for verification.</p>
          <a href="tel:*182%23" className="mt-3 inline-flex btn-secondary">Dial *182#</a>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="input-field sm:max-w-xs" placeholder="Amount in RWF" /><button type="button" onClick={() => handleTransaction('deposit')} disabled={!!processing} className="btn-secondary inline-flex items-center justify-center gap-2"><FaArrowDown className="text-green-600" />{processing === 'deposit' ? 'Submitting...' : 'I sent the deposit'}</button><button type="button" onClick={() => handleTransaction('withdraw')} disabled={!!processing} className="btn-primary inline-flex items-center justify-center gap-2"><FaArrowUp />{processing === 'withdraw' ? 'Processing...' : 'Withdraw'}</button></div>
      </section>

      <section className="card mt-6 overflow-hidden"><div className="border-b border-dark-100 px-5 py-4"><h2 className="font-semibold text-dark-900">Recent transactions</h2></div>{!wallet?.transactions?.length ? <p className="p-6 text-sm text-dark-500">No wallet transactions yet.</p> : <div className="divide-y divide-dark-100">{wallet.transactions.map((transaction) => <div key={transaction._id} className="flex items-center justify-between px-5 py-4"><div><p className="font-medium capitalize text-dark-800">{transaction.type}</p><p className="text-xs text-dark-500">{new Date(transaction.createdAt).toLocaleString()} · {transaction.status}</p></div><span className={transaction.type === 'deposit' ? 'font-semibold text-green-600' : 'font-semibold text-primary-600'}>{transaction.type === 'deposit' ? '+' : '-'}{formatMoney(transaction.amount)}</span></div>)}</div>}</section>
    </div>
  );
};

export default Wallet;
