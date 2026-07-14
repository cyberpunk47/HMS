import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getUniquePatientCountsByDoctor } from '@/Service/AppointmentService';
import { addZeroMonths } from '@/Utility/OtherUtility';
import { useSelector } from 'react-redux';

const PatientMetrics = () => {
    const user = useSelector((state: any) => state.user);

    const { data: chartData = [], isLoading } = useQuery({
        queryKey: ["patientMetrics", user?.profileId],
        queryFn: () => getUniquePatientCountsByDoctor(user?.profileId),
        select: (res) => addZeroMonths(res, "month", "count"),
        enabled: !!user?.profileId,
    });

    const getSum = (data: any[], key: string) => {
        return data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
    };

    if (isLoading) {
        return <div className="p-5 text-gray-500">Loading metrics...</div>;
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Patients</CardTitle>
                        <CardDescription>{new Date().getFullYear()} overview</CardDescription>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                        {getSum(chartData, "count")}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => v.slice(0, 3)}
                            />
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
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#colorPatients)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default PatientMetrics;