import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CalendarCheck, Clock, Check, X, CalendarDays, Loader2, FileSpreadsheet } from 'lucide-react';
import { getAppointmentsByPatient } from '../../../Service/AppointmentService';
import { getPatient } from '../../../Service/PatientProfileService';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatDateWithtimeUtil } from '../../../Utility/DateUtility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const user = useSelector((state: any) => state.user);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptData, profileData] = await Promise.all([
          getAppointmentsByPatient(user.profileId),
          getPatient(user.profileId),
        ]);
        setAppointments(apptData || []);
        setProfile(profileData || {});
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.profileId]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysAppointments = appointments.filter((a) => {
    const d = new Date(a.appointmentTime);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const upcomingAppointments = appointments.filter((a) => {
    const d = new Date(a.appointmentTime);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime() && a.status !== 'CANCELLED';
  });

  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED').length;
  const scheduledCount = appointments.filter((a) => a.status === 'SCHEDULED').length;
  const totalCount = appointments.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge className="bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100">Scheduled</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      case 'CANCELLED':
      default:
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  const chartData = [
    { name: 'Scheduled', value: scheduledCount, color: '#0d9488' },
    { name: 'Completed', value: completedCount, color: '#6366f1' },
    { name: 'Cancelled', value: cancelledCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <Loader2 className="animate-spin text-teal-600" size={36} />
        <span className="text-sm text-gray-500">Preparing your health overview...</span>
      </div>
    );
  }

  const statCards = [
    { label: "Today", value: todaysAppointments.length, icon: CalendarCheck, color: "text-teal-600", bg: "bg-teal-100" },
    { label: "Upcoming", value: upcomingAppointments.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Completed", value: completedCount, icon: Check, color: "text-green-600", bg: "bg-green-100" },
    { label: "Cancelled", value: cancelledCount, icon: X, color: "text-red-600", bg: "bg-red-100" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, <span className="text-teal-600">{user.name}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here is a summary of your health records and upcoming visits.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 ${stat.bg} rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Schedule</CardTitle>
                  <CardDescription>Your medical visits planned for today</CardDescription>
                </div>
                <Badge variant="secondary">{todaysAppointments.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {todaysAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CalendarDays className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {todaysAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">Dr. {appt.doctorName}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{appt.reason}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateWithtimeUtil(appt.appointmentTime)}</p>
                      </div>
                      {getStatusBadge(appt.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Overview Ring */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] flex items-center justify-center relative">
                {totalCount > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          background: '#1f2937',
                          color: '#fff',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                        }}
                      />
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-[150px] h-[150px] rounded-full border-[14px] border-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-medium">No data</span>
                  </div>
                )}

                {totalCount > 0 && (
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-medium tracking-wide">Total</span>
                  </div>
                )}
              </div>

              {totalCount > 0 && (
                <div className="flex justify-center gap-4 mt-3 border-t pt-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-600"></div>
                    <span className="text-xs text-gray-500">Scheduled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    <span className="text-xs text-gray-500">Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-500">Cancelled</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming visits */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming Visits</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400">No upcoming visits planned</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {upcomingAppointments.slice(0, 4).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900">Dr. {appt.doctorName}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {formatDateWithtimeUtil(appt.appointmentTime)?.replace(', ', ' · ')}
                        </p>
                      </div>
                      {getStatusBadge(appt.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
