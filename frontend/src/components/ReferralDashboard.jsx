import React, { useState, useEffect } from 'react';
import { Users, Gift, TrendingUp, Share2, Copy, Check, Calendar, DollarSign } from 'lucide-react';
import referralAPI from '../services/referralAPI';
import { toast } from 'sonner';

const ReferralDashboard = ({ token }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [referralStats, setReferralStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [activePrograms, setActivePrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referralForm, setReferralForm] = useState({
    programId: '',
    referredEmail: '',
    trackingData: {}
  });
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    fetchReferralData();
  }, [token]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [statsResponse, programsResponse] = await Promise.all([
        referralAPI.getUserReferralStats(token),
        referralAPI.getActivePrograms()
      ]);

      setReferralStats(statsResponse.data);
      setReferrals(statsResponse.data.referrals);
      setActivePrograms(programsResponse.data);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    try {
      const response = await referralAPI.createReferral(token, referralForm);
      toast.success('Referral created successfully!');
      
      // Reset form
      setReferralForm({
        programId: '',
        referredEmail: '',
        trackingData: {}
      });
      
      // Refresh data
      fetchReferralData();
    } catch (error) {
      console.error('Failed to create referral:', error);
      toast.error(error.message || 'Failed to create referral');
    }
  };

  const copyReferralCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Referral code copied to clipboard!');
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const copyShareLink = (code) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Share link copied!');
  };

  const shareOnSocial = (platform, referralCode) => {
    const shareUrl = `${window.location.origin}/invite/${referralCode}`;
    const shareText = `Join me and get amazing rewards! Use my referral code: ${referralCode}`;
    
    let shareUrlPlatform = '';
    switch (platform) {
      case 'twitter':
        shareUrlPlatform = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        shareUrlPlatform = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        shareUrlPlatform = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrlPlatform, '_blank', 'width=600,height=400');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'invalid': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRewardTypeIcon = (type) => {
    switch (type) {
      case 'points': return <Gift className="w-4 h-4" />;
      case 'coupon': return <DollarSign className="w-4 h-4" />;
      case 'cash': return <TrendingUp className="w-4 h-4" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Program</h1>
        <p className="text-gray-600">Invite friends and earn amazing rewards!</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Referrals</p>
              <p className="text-2xl font-bold text-gray-900">
                {referralStats?.stats?.totalReferrals || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {referralStats?.stats?.completedReferrals || 0}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {referralStats?.stats?.pendingReferrals || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rewards</p>
              <p className="text-2xl font-bold text-purple-600">
                {referralStats?.stats?.totalRewards || 0}
              </p>
            </div>
            <Gift className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Conversion Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rate</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Completed</span>
            <span className="text-green-600 font-medium">
              {referralStats?.stats?.completedReferrals || 0}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded">
            <div
              className="h-3 bg-green-500 rounded"
              style={{ width: `${Math.min(100, Math.round(((referralStats?.stats?.completedReferrals || 0) / Math.max(1, referralStats?.stats?.totalReferrals || 1)) * 100))}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500">
            {Math.round(((referralStats?.stats?.completedReferrals || 0) / Math.max(1, referralStats?.stats?.totalReferrals || 1)) * 100)}%
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-sm font-semibold">{referralStats?.stats?.totalReferrals || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-sm font-semibold text-yellow-600">{referralStats?.stats?.pendingReferrals || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-sm font-semibold text-green-600">{referralStats?.stats?.completedReferrals || 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'create', label: 'Create Referral' },
              { id: 'referrals', label: 'My Referrals' },
              { id: 'programs', label: 'Active Programs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Referring Today!</h3>
                <p className="text-gray-600 mb-6">
                  Invite your friends and earn rewards when they complete their first purchase.
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Referral
                </button>
              </div>
            </div>
          )}

          {/* Create Referral Tab */}
          {activeTab === 'create' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Referral</h3>
              <form onSubmit={handleCreateReferral} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Program
                  </label>
                  <select
                    value={referralForm.programId}
                    onChange={(e) => setReferralForm({...referralForm, programId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a referral program</option>
                    {activePrograms.map((program) => (
                      <option key={program._id} value={program._id}>
                        {program.name} - Reward: {program.referrerReward.amount} {program.referrerReward.type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Friend's Email
                  </label>
                  <input
                    type="email"
                    value={referralForm.referredEmail}
                    onChange={(e) => setReferralForm({...referralForm, referredEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your friend's email address"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Referral Invitation
                </button>
              </form>
            </div>
          )}

          {/* My Referrals Tab */}
          {activeTab === 'referrals' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Referrals</h3>
              {referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You haven't created any referrals yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((referral) => (
                    <div key={referral._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {referral.referredId?.firstName} {referral.referredId?.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{referral.referredId?.email}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                          {referral.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600">
                            Code: <span className="font-mono font-medium">{referral.referralCode}</span>
                          </span>
                          <button
                            onClick={() => copyReferralCode(referral.referralCode)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {copiedCode === referral.referralCode ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyShareLink(referral.referralCode)}
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Copy link</span>
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getRewardTypeIcon(referral.referrerReward?.type)}
                          <span className="text-gray-600">
                            Reward: {referral.referrerReward?.amount} {referral.referrerReward?.type}
                          </span>
                        </div>
                      </div>
                      
                      {referral.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Referred on: {new Date(referral.referralDate).toLocaleDateString()}
                          </p>
                          <div className="mt-3 flex items-center space-x-4">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${window.location.origin}/register?ref=${referral.referralCode}`)}`}
                              alt="QR"
                              className="w-20 h-20 border rounded"
                            />
                            <div className="text-xs text-gray-500">
                              Scan to register with your referral
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Programs Tab */}
          {activeTab === 'programs' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Referral Programs</h3>
              {activePrograms.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active referral programs available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activePrograms.map((program) => (
                    <div key={program._id} className="border border-gray-200 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-2">{program.name}</h4>
                      <p className="text-gray-600 text-sm mb-4">{program.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Your Reward:</span>
                          <span className="font-medium">
                            {program.referrerReward.amount} {program.referrerReward.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Friend's Reward:</span>
                          <span className="font-medium">
                            {program.referredReward.amount} {program.referredReward.type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-4">
                        Valid until: {new Date(program.endDate).toLocaleDateString()}
                      </div>
                      
                      <button
                        onClick={() => {
                          setReferralForm({...referralForm, programId: program._id});
                          setActiveTab('create');
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Use This Program
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
