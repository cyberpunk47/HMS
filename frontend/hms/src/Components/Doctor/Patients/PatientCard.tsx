import { Avatar, Divider } from "@mantine/core"
import { bloodGroupMap } from "../../../data/DropdownData"
import { IconCalendarHeart, IconMail, IconMapPin, IconPhone } from "@tabler/icons-react"

const PatientCard = ({ name, email, dob, phone, id, address, aadharNo, bloodGroup, allergies, chronicDesease }: any) => {
    const getAge = (dob: string) => {
        if (!dob) return "N/A";
        try {
            const birthDate = new Date(dob);
            if (isNaN(birthDate.getTime())) return "N/A";
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDifference = today.getMonth() - birthDate.getMonth();
            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age.toString() + " Years";
        } catch (e) {
            return "N/A";
        }
    }

    const getBloodGroup = (bg: string) => {
        if (!bg) return "N/A";
        if (bloodGroupMap && bloodGroupMap[bg]) {
            return bloodGroupMap[bg];
        }
        return bg;
    }

    return (
        <div className="border p-4 flex flex-col gap-2 hover:bg-primary-50 transition duration-300 ease-in-out rounded-xl hover:shadow-[0_0_5px_1px_blue] !shadow-primary-500 cursor-pointer space-y-2">
            <div className="flex items-center gap-3">
                <Avatar size="md" name={name} color="initials" variant="filled" />
                <div>
                    <div className="font-semibold text-primary-900">{name || "Unnamed Patient"}</div>
                    <div className="text-xs text-gray-500 font-medium">
                        Blood Group: {getBloodGroup(bloodGroup)}
                    </div>
                </div>
            </div>
            <Divider />
            <div className="flex text-xs items-center gap-3">
                <IconMail className="text-xs text-primary-700 bg-primary-100 p-1 rounded-full flex-shrink-0" size={24} />
                <div className="truncate text-gray-700">{email || "No Email"}</div>
            </div>

            <div className="flex text-xs items-center gap-3">
                <IconPhone className="text-xs text-primary-700 bg-primary-100 p-1 rounded-full flex-shrink-0" size={24} />
                <div className="text-gray-700">{phone ? `+91 ${phone}` : "No Phone"}</div>
            </div>

            <div className="flex text-xs items-center gap-3">
                <IconMapPin className="text-xs text-primary-700 bg-primary-100 p-1 rounded-full flex-shrink-0" size={24} />
                <div className="truncate text-gray-700">{address || "No Address"}</div>
            </div>

            <div className="flex text-xs items-center gap-3">
                <IconCalendarHeart className="text-xs text-primary-700 bg-primary-100 p-1 rounded-full flex-shrink-0" size={24} />
                <div className="text-gray-700">{getAge(dob)}</div>
            </div>
        </div>
    )
}

export default PatientCard;
//