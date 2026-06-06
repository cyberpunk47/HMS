import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { countAppointmentsByDoctor } from '../../../Service/AppointmentService';
import { addZeroMonths } from '../../../Utility/OtherUtility';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const Metrices = () => {
    const [appointments, setAppointments] = useState<any[]>([]);
    const user = useSelector((state: any) => state.user);

    useEffect(() => {
        countAppointmentsByDoctor(user.profileId)
            .then((res) => {
                setAppointments(addZeroMonths(res, "month", "count"));
            })
            .catch((err) => {
                console.log(err);
            });
    }, []);

    const getSum = (data: any[], key: string) => {
        if (!data || !Array.isArray(data)) return 0;
        return data.reduce((sum, item) => {
            const val = Number(item?.[key]);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Appointments</CardTitle>
                        <CardDescription>Monthly overview</CardDescription>
                    </div>
                    <span className="text-2xl font-bold text-teal-600">
                        {getSum(appointments, "count")}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={appointments}>
                            <defs>
                                <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month" hide />
                            <Tooltip
                                contentStyle={{
                                    background: '#1f2937',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '12px',
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#0d9488"
                                strokeWidth={2}
                                fill="url(#colorAppointments)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default Metrices;