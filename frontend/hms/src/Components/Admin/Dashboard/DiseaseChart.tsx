import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { countAllReasons } from '../../../Service/AppointmentService';
import { convertReasonChartData } from '../../../Utility/OtherUtility';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DiseaseChart = () => {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        countAllReasons()
            .then((res) => {
                setData(convertReasonChartData(res));
            })
            .catch((err) => {
                console.log(err);
            });
    }, []);

    const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle>Reason Distribution</CardTitle>
                <CardDescription>Patient visit reasons breakdown</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                                label={(props: any) =>
                                    `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                                }
                            >
                                {data.map((_entry: any, idx: number) => (
                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: '#1f2937',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '12px',
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        No data available
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DiseaseChart;