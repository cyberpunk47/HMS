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
import { getAllDoctors } from '../../../Service/DoctorProfileService';
import { useQuery } from '@tanstack/react-query';

const Doctors = () => {
    const { data: doctors, isPending, error } = useQuery({
        queryKey: ["doctors"],
        queryFn: () => getAllDoctors(),
    });

    if (isPending) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-sm text-gray-400">
                    Loading doctors...
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-sm text-red-400">
                    Error loading doctors
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Doctors</CardTitle>
                        <CardDescription>All registered doctors</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {doctors?.length || 0} total
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {doctors && doctors.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {doctors.map((doc: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{doc.name}</TableCell>
                                        <TableCell className="text-gray-500">{doc.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {doc.department}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{doc.address}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center text-sm text-gray-400">
                        No doctors found
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Doctors;