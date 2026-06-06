import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, Stethoscope } from 'lucide-react';
import { countAllAppointments } from '../../../Service/AppointmentService';
import { addZeroMonths } from '../../../Utility/OtherUtility';
import { getRegistrationCounts } from '../../../Service/UserService';
import { useQuery } from '@tanstack/react-query';

const Topcards = () => {
    const { data: apData = [] } = useQuery({
        queryKey: ["appointments"],
        queryFn: async () => {
            const res = await countAllAppointments();
            return addZeroMonths(res, "month", "count");
        },
    });

    const { data: registrationData } = useQuery({
        queryKey: ["registrations"],
        queryFn: getRegistrationCounts,
    });

    const ptData = registrationData
        ? addZeroMonths(registrationData.patientCounts, "month", "count")
        : [];

    const drData = registrationData
        ? addZeroMonths(registrationData.doctorCounts, "month", "count")
        : [];

    const getSum = (data: any[], key: string) => {
        if (!data || !Array.isArray(data)) return 0;
        return data.reduce((sum, item) => {
            const val = Number(item?.[key]);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    };

    const stats = [
        {
            title: "Appointments",
            value: getSum(apData, "count"),
            icon: Calendar,
            trend: "This year total",
            iconBg: "bg-teal-100",
            iconColor: "text-teal-600",
        },
        {
            title: "Patients",
            value: getSum(ptData, "count"),
            icon: Users,
            trend: "Registered this year",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
        },
        {
            title: "Doctors",
            value: getSum(drData, "count"),
            icon: Stethoscope,
            trend: "Active this year",
            iconBg: "bg-violet-100",
            iconColor: "text-violet-600",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat) => (
                <Card key={stat.title} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
                                <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
                            </div>
                            <div className={`h-12 w-12 rounded-full ${stat.iconBg} flex items-center justify-center`}>
                                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default Topcards;