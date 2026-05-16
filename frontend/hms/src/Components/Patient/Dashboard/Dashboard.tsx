import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, Text, Badge, Loader, RingProgress, Divider } from '@mantine/core';
import { IconCalendarCheck, IconClock, IconCheck, IconX, IconCalendarEvent, IconReportMedical } from '@tabler/icons-react';
import { getAppointmentsByPatient } from '../../../Service/AppointmentService';
import { getPatient } from '../../../Service/PatientProfileService';
import { formatDateWithTime } from '../../../Utility/DateUtility';

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
        return d.getTime() > today.getTime();
    });

    const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
    const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED').length;
    const scheduledCount = appointments.filter((a) => a.status === 'SCHEDULED').length;
    const totalCount = appointments.length;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SCHEDULED': return 'blue';
            case 'COMPLETED': return 'green';
            case 'CANCELLED': return 'red';
            default: return 'gray';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Welcome Section */}
            <div className="mb-6">
                <Text className="text-2xl font-semibold text-neutral-800">
                    Welcome, {user.name}
                </Text>
                <Text size="sm" c="dimmed">
                    Here's your health overview
                </Text>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <IconCalendarCheck size={24} className="text-blue-500" />
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Today</Text>
                            <Text size="xl" fw={700}>{todaysAppointments.length}</Text>
                        </div>
                    </div>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <IconClock size={24} className="text-green-500" />
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Upcoming</Text>
                            <Text size="xl" fw={700}>{upcomingAppointments.length}</Text>
                        </div>
                    </div>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <IconCheck size={24} className="text-teal-500" />
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Completed</Text>
                            <Text size="xl" fw={700}>{completedCount}</Text>
                        </div>
                    </div>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <IconX size={24} className="text-red-500" />
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Cancelled</Text>
                            <Text size="xl" fw={700}>{cancelledCount}</Text>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Appointments */}
                <div className="lg:col-span-2">
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <div className="flex justify-between items-center mb-4">
                            <Text size="lg" fw={600}>Today's Appointments</Text>
                            <Badge variant="light" size="lg">{todaysAppointments.length}</Badge>
                        </div>
                        <Divider mb="md" />
                        {todaysAppointments.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-gray-400">
                                <IconCalendarEvent size={48} stroke={1} />
                                <Text size="sm" mt="sm">No appointments for today</Text>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                                {todaysAppointments.map((appt) => (
                                    <div
                                        key={appt.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                    >
                                        <div className="flex flex-col">
                                            <Text fw={500}>Dr. {appt.doctorName}</Text>
                                            <Text size="xs" c="dimmed">{appt.reason}</Text>
                                            <Text size="xs" c="dimmed">{formatDateWithTime(appt.appointmentTime)}</Text>
                                        </div>
                                        <Badge color={getStatusColor(appt.status)} variant="light">
                                            {appt.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Overview Ring */}
                <div>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Text size="lg" fw={600} mb="md">Overview</Text>
                        <Divider mb="md" />
                        <div className="flex flex-col items-center">
                            <RingProgress
                                size={180}
                                thickness={16}
                                roundCaps
                                sections={totalCount > 0 ? [
                                    { value: (scheduledCount / totalCount) * 100, color: 'blue' },
                                    { value: (completedCount / totalCount) * 100, color: 'teal' },
                                    { value: (cancelledCount / totalCount) * 100, color: 'red' },
                                ] : [{ value: 100, color: 'gray.2' }]}
                                label={
                                    <Text ta="center" size="lg" fw={700}>
                                        {totalCount}
                                        <Text size="xs" c="dimmed">Total</Text>
                                    </Text>
                                }
                            />
                            <div className="flex gap-4 mt-4">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <Text size="xs">Scheduled</Text>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                                    <Text size="xs">Completed</Text>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <Text size="xs">Cancelled</Text>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Upcoming */}
                    <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
                        <Text size="lg" fw={600} mb="md">Upcoming</Text>
                        <Divider mb="md" />
                        {upcomingAppointments.length === 0 ? (
                            <div className="flex flex-col items-center py-4 text-gray-400">
                                <IconCalendarEvent size={32} stroke={1} />
                                <Text size="xs" mt="xs">No upcoming appointments</Text>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                                {upcomingAppointments.slice(0, 5).map((appt) => (
                                    <div key={appt.id} className="flex justify-between items-center p-2 border rounded-md">
                                        <div>
                                            <Text size="sm" fw={500}>Dr. {appt.doctorName}</Text>
                                            <Text size="xs" c="dimmed">{formatDateWithTime(appt.appointmentTime)}</Text>
                                        </div>
                                        <Badge size="sm" color={getStatusColor(appt.status)} variant="light">
                                            {appt.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
