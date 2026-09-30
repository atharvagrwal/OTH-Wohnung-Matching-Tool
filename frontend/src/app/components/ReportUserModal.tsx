import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../services/api';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: number;
  reportedUserName: string;
  reporterId: number;
}

export function ReportUserModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  reporterId,
}: ReportUserModalProps) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.reportUser(reporterId, reportedUserId, description);
      toast.success('Report sent to support. Thank you for helping us maintain a safe community.');
      setDescription('');
      onClose();
    } catch (error) {
      toast.error('Failed to send report');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Report User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reporting
            </label>
            <p className="text-sm text-gray-600">{reportedUserName}</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
              Describe the issue (min 10 characters)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Please describe what happened..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length} / 10 characters
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || description.trim().length < 10}
              className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
