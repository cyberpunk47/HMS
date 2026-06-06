import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { getTodaysAppointments } from '../../../Service/AppointmentService';
import { extractTimeIn12HourFormat } from '../../../Utility/DateUtility';

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
                        <CardDescription>Scheduled for today</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {tdAppointment.length} total
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {tdAppointment.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Doctor</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tdAppointment.map((apt, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{apt.patientName}</TableCell>
                                        <TableCell className="text-gray-600">Dr. {apt.doctorName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {extractTimeIn12HourFormat(apt.appointmentTime)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">{apt.reason}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center text-sm text-gray-400">
                        No appointments scheduled for today
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Appointments;