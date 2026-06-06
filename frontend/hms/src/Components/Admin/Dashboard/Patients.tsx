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
import { getAllPatients } from '../../../Service/PatientProfileService';
import { bloodGroupMap } from '../../../data/DropdownData';

const Patients = () => {
    const [patients, setPatients] = useState<any[]>([]);

    useEffect(() => {
        getAllPatients()
            .then((data) => {
                setPatients(data);
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Patients</CardTitle>
                        <CardDescription>All registered patients</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {patients.length} total
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {patients.length > 0 ? (
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
                                {patients.map((pt, idx) => (
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