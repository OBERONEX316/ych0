import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BarChart3, Users, Gift, TrendingUp } from 'lucide-react';
import referralAPI from '../services/referralAPI';
import { toast } from 'sonner';

const AdminReferralPage = ({ token }) => {
  const [programs, setPrograms] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
    conditions: {
      requiredOrderAmount: 0,
      requiredOrderCount: 0,
      requiredRegistrationDays: 0
    },
    referrerReward: {
      type: 'points',
      amount: 0
    },
    referredReward: {
      type: 'points',
      amount: 0
    },
    referralCodeSettings: {
      codeType: 'auto',
      prefix: '',
      length: 8
    },
    sharingSettings: {
      enabled: true,
      platforms: ['twitter', 'facebook', 'linkedin'],
      customMessage: ''
    },
    eligibility: {
      minPurchaseAmount: 0,
      minRegistrationDays: 0,
      requiredMembershipLevel: '',
      maxReferralsPerUser: 10
    }
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [programsResponse, statsResponse] = await Promise.all([
        referralAPI.getAllReferralPrograms(token),
        referralAPI.getReferralStatistics(token)
      ]);

      setPrograms(programsResponse.data.programs);
      setStatistics(statsResponse.data);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProgram) {
        await referralAPI.updateReferralProgram(token, editingProgram._id, formData);
        toast.success('Referral program updated successfully!');
      } else {
        await referralAPI.createReferralProgram(token, formData);
        toast.success('Referral program created successfully!');
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save referral program:', error);
      toast.error(error.message || 'Failed to save referral program');
    }
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description,
      startDate: program.startDate.split('T')[0],
      endDate: program.endDate.split('T')[0],
      isActive: program.isActive,
      conditions: { ...program.conditions },
      referrerReward: { ...program.referrerReward },
      referredReward: { ...program.referredReward },
      referralCodeSettings: { ...program.referralCodeSettings },
      sharingSettings: { ...program.sharingSettings },
      eligibility: { ...program.eligibility }
    });
    setShowForm(true);
  };

  const handleDelete = async (programId) => {
    if (window.confirm('Are you sure you want to delete this referral program?')) {
      try {
        await referralAPI.deleteReferralProgram(token, programId);
        toast.success('Referral program deleted successfully!');
        fetchData();
      } catch (error) {
        console.error('Failed to delete referral program:', error);
        toast.error('Failed to delete referral program');
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProgram(null);
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      isActive: true,
      conditions: {
        requiredOrderAmount: 0,
        requiredOrderCount: 0,
        requiredRegistrationDays: 0
      },
      referrerReward: {
        type: 'points',
        amount: 0
      },
      referredReward: {
        type: 'points',
        amount: 0
      },
      referralCodeSettings: {
        codeType: 'auto',
        prefix: '',
        length: 8
      },
      sharingSettings: {
        enabled: true,
        platforms: ['twitter', 'facebook', 'linkedin'],
        customMessage: ''
      },
      eligibility: {
        minPurchaseAmount: 0,
        minRegistrationDays: 0,
        requiredMembershipLevel: '',
        maxReferralsPerUser: 10
      }
    });
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Referral Program Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Program</span>
        </button>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.overallStats.totalReferrals}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.overallStats.completedReferrals}
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
                  {statistics.overallStats.pendingReferrals}
                </p>
              </div>
              <Users className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rewards</p>
                <p className="text-2xl font-bold text-purple-600">
                  {statistics.overallStats.totalRewardsAwarded}
                </p>
              </div>
              <Gift className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Program Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProgram ? 'Edit Referral Program' : 'Create Referral Program'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Program Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Completion Conditions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Conditions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Required Order Amount</label>
                    <input
                      type="number"
                      value={formData.conditions.requiredOrderAmount}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, requiredOrderAmount: Number(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Required Order Count</label>
                    <input
                      type="number"
                      value={formData.conditions.requiredOrderCount}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, requiredOrderCount: Number(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Required Registration Days</label>
                    <input
                      type="number"
                      value={formData.conditions.requiredRegistrationDays}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, requiredRegistrationDays: Number(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Rewards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Referrer Reward</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reward Type</label>
                      <select
                        value={formData.referrerReward.type}
                        onChange={(e) => setFormData({
                          ...formData,
                          referrerReward: {...formData.referrerReward, type: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="points">Points</option>
                        <option value="coupon">Coupon</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reward Amount</label>
                      <input
                        type="number"
                        value={formData.referrerReward.amount}
                        onChange={(e) => setFormData({
                          ...formData,
                          referrerReward: {...formData.referrerReward, amount: Number(e.target.value)}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Referred Reward</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reward Type</label>
                      <select
                        value={formData.referredReward.type}
                        onChange={(e) => setFormData({
                          ...formData,
                          referredReward: {...formData.referredReward, type: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="points">Points</option>
                        <option value="coupon">Coupon</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reward Amount</label>
                      <input
                        type="number"
                        value={formData.referredReward.amount}
                        onChange={(e) => setFormData({
                          ...formData,
                          referredReward: {...formData.referredReward, amount: Number(e.target.value)}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Eligibility */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Eligibility Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Purchase Amount</label>
                    <input
                      type="number"
                      value={formData.eligibility.minPurchaseAmount}
                      onChange={(e) => setFormData({
                        ...formData,
                        eligibility: {...formData.eligibility, minPurchaseAmount: Number(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Registration Days</label>
                    <input
                      type="number"
                      value={formData.eligibility.minRegistrationDays}
                      onChange={(e) => setFormData({
                        ...formData,
                        eligibility: {...formData.eligibility, minRegistrationDays: Number(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Required Membership Level</label>
                    <input
                      type="text"
                      value={formData.eligibility.requiredMembershipLevel}
                      onChange={(e) => setFormData({
                        ...formData,
                        eligibility: {...formData.eligibility, requiredMembershipLevel: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Gold, Platinum"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Referrals Per User</label>
                    <input
                      type="number"
                      value={formData.eligibility.maxReferralsPerUser}
                      onChange={(e) => setFormData({
                        ...formData,
                        eligibility: {...formData.eligibility, maxReferralsPerUser: Number(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingProgram ? 'Update Program' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Programs List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Referral Programs</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rewards</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {programs.map((program) => (
                <tr key={program._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{program.name}</div>
                      <div className="text-sm text-gray-500">{program.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(program.isActive)}`}>
                      {program.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Referrer: {program.referrerReward.amount} {program.referrerReward.type}</div>
                    <div>Referred: {program.referredReward.amount} {program.referredReward.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(program)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(program._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {programs.length === 0 && (
            <div className="text-center py-8">
              <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No referral programs found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReferralPage;
