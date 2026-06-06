import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserProfile } from '../../../Service/UserService';
import useProtectedImage from '../../Utilities/Dropzone/useProtectedImage';
import { getDoctor } from '../../../Service/DoctorProfileService';
import { Briefcase, MapPin } from 'lucide-react';

const Welcome = () => {
    const user = useSelector((state: any) => state.user);
    const [picId, setPicId] = useState<string | null>(null);
    const [doctorInfo, setDoctorInfo] = useState<any>({});

    useEffect(() => {
        if (!user) return;
        getUserProfile(user.id)
            .then((data) => setPicId(data))
            .catch((error) => console.log(error));
        getDoctor(user.profileId)
            .then((data) => setDoctorInfo(data))
            .catch((error) => console.log(error));
    }, []);

    const url = useProtectedImage(picId);

    const getInitials = (name: string) => {
        if (!name) return "DR";
        return name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card className="hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center gap-5">
                    <Avatar className="h-16 w-16 border-2 border-teal-100">
                        {url ? <AvatarImage src={url} alt={user.name} /> : null}
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-lg font-semibold">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="text-sm text-gray-500">Welcome back</p>
                        <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {doctorInfo.specialization && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                    <Briefcase size={12} />
                                    {doctorInfo.specialization}
                                </Badge>
                            )}
                            {doctorInfo.department && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <MapPin size={12} />
                                    {doctorInfo.department}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default Welcome;