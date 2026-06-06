import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const PatientMetrics = () => {
    const data = [
        { date: 'January', patients: 5 },
        { date: 'February', patients: 8 },
        { date: 'March', patients: 12 },
        { date: 'April', patients: 7 },
        { date: 'May', patients: 14 },
        { date: 'June', patients: 9 },
        { date: 'July', patients: 11 },
        { date: 'August', patients: 6 },
        { date: 'September', patients: 10 },
        { date: 'October', patients: 13 },
        { date: 'November', patients: 4 },
        { date: 'December', patients: 15 },
    ];

    const getSum = (data: any[], key: string) => {
        return data.reduce((sum, item) => sum + item[key], 0);
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Patients</CardTitle>
                        <CardDescription>{new Date().getFullYear()} overview</CardDescription>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                        {getSum(data, "patients")}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
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
                                dataKey="patients"
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