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
import { useQuery } from '@tanstack/react-query';
import { getPatientsDetailsByIds } from '../../../Service/PatientProfileService';
import { getPatientIdsByDoctor } from '../../../Service/AppointmentService';
import { useSelector } from 'react-redux';
import { bloodGroupMap } from '../../../data/DropdownData';

const Patients = () => {
    const user = useSelector((state: any) => state.user);

    const { data: patients = [], isLoading } = useQuery({
        queryKey: ["doctorDashboardPatients", user?.profileId],
        queryFn: async () => {
            if (!user?.profileId) return [];
            const ids = await getPatientIdsByDoctor(user.profileId);
            if (!ids || ids.length === 0) return [];
            return getPatientsDetailsByIds(ids);
        },
        enabled: !!user?.profileId,
    });

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Patients</CardTitle>
                        <CardDescription>Your patients</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {patients.length} total
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                        Loading patients...
                    </div>
                ) : patients.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Blood Group</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patients.map((pt: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{pt.name}</TableCell>
                                        <TableCell className="text-gray-500">{pt.email}</TableCell>
                                        <TableCell className="text-gray-500">{pt.address}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {bloodGroupMap[pt.bloodGroup]}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center text-sm text-gray-400">
                        No patients found
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Patients;