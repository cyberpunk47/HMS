import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { getTodaysAppointments } from '../../../Service/AppointmentService';
import { extractTimeIn12HourFormat } from '../../../Utility/DateUtility';
import { Clock } from 'lucide-react';

const Appointments = () => {
    const [tdAppointment, setTdAppointment] = useState<any[]>([]);

    useEffect(() => {
        getTodaysAppointments()
            .then((res) => {
                setTdAppointment(res);
            })
            .catch((err) => {
                console.log(err);
            });
    }, []);

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Today's Appointments</CardTitle>
                        <CardDescription>Your schedule for today</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {tdAppointment.length} total
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {tdAppointment.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                        {tdAppointment.map((apt, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{apt.patientName}</p>
                                    <p className="text-xs text-gray-500">{apt.reason}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <Clock size={14} />
                                    <span className="text-sm font-medium">
                                        {extractTimeIn12HourFormat(apt.appointmentTime)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-sm text-gray-400">
                        No appointments for today
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Appointments;