import { User, Phone, CalendarClock, Activity, FileText } from 'lucide-react';
import { formatDateWithtimeUtil } from '../../../Utility/DateUtility';
import { useNavigate } from 'react-router-dom';

interface ApCardProps {
  id: number;
  patientName: string;
  patientPhone: string;
  notes: string;
  reason: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  appointmentTime: string;
}

const ApCard = ({ id, patientName, patientPhone, notes, reason, status, appointmentTime }: ApCardProps) => {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    if (!name) return 'PT';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getStatusStyle = () => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-[#EAFDF5] text-[#10B981] border-[#A7F3D0]';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'CANCELLED':
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getStatusDot = () => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-[#10B981]';
      case 'COMPLETED':
        return 'bg-slate-500';
      case 'CANCELLED':
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div
      onClick={() => navigate(`${id}`)}
      className="bg-white border border-[#E5E0D8] rounded-2xl p-5 shadow-[4px_4px_0px_0px_#E5E0D8] hover:border-[#2E2D2B] hover:shadow-[4px_4px_0px_0px_#2E2D2B] transition-all duration-200 flex flex-col justify-between h-[230px] group cursor-pointer relative"
    >
      <div>
        {/* Top Header Row */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex gap-2.5 items-center min-w-0">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E5E0D8] bg-[#FAF7F2] text-[#2E2D2B] text-xs font-bold font-sans group-hover:bg-[#EAE4D9] group-hover:border-[#2E2D2B] transition-all duration-200 flex-shrink-0">
              {getInitials(patientName)}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[#2E2D2B] truncate group-hover:text-black">
                {patientName}
              </h3>
              <p className="text-[9px] tracking-wide text-[#7A756B] uppercase font-semibold">Patient</p>
            </div>
          </div>

          <span className={`border rounded-full px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 flex-shrink-0 ${getStatusStyle()}`}>
            <span className={`w-1 h-1 rounded-full ${getStatusDot()}`}></span>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        </div>

        {/* Content rows */}
        <div className="mt-4 space-y-2">
          {patientPhone && (
            <div className="flex items-center gap-2 text-xs text-[#7A756B]">
              <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">+91 {patientPhone}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-[#7A756B]">
            <CalendarClock className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">{formatDateWithtimeUtil(appointmentTime)?.replace(', ', ' · ')}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#2E2D2B] font-semibold">
            <Activity className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">{reason}</span>
          </div>

          {notes && (
            <div className="flex items-start gap-2 text-xs text-[#7A756B] max-h-12 overflow-hidden">
              <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-normal line-clamp-2 italic font-serif">"{notes}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Card Info */}
      <div className="flex justify-between items-center border-t border-[#FAF7F2] pt-3.5">
        <span className="text-[10px] text-[#7A756B] font-semibold tracking-wide uppercase">ID: #{id}</span>
        <span className="text-xs text-[#2E2D2B] font-bold group-hover:underline">View details →</span>
      </div>
    </div>
  );
};

export default ApCard;
