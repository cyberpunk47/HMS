import { Avatar, Button, Divider, Modal, NumberInput, Select, Table, TagsInput, TextInput } from '@mantine/core'
import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { IconEdit } from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import PhoneInput from 'react-phone-input-2';
import { bloodGroupLabels, bloodGroups, genderOptions } from '../../../Data/DropdownData';
import { useDisclosure } from '@mantine/hooks';
import { getPatient, updatePatient } from '../../../Service/PatientProfileService';
import { formatDate } from '../../../Utility/DateUtility';
import { useForm } from '@mantine/form';
import { errorNotification, successNotification } from '../../../Utility/NotificationUtil';
import { arrayToCSV } from '../../../Utility/OtherUtility';
//mock data
const patient: any = {
    dob: '1990-05-15',
    phone: '+91 9876543210',
    address: '123 Main Street, Bangalore, Karnataka',
    aadharNo: '1234-5678-9012',
    bloodGroup: 'O+',
    gender: 'Male',
    allergies: ['Peanuts', 'Dust'],
    chronicDisease: ['Asthma']
};

const Profile = () => {
    const user = useSelector((state: any) => state.user);
    const [opened, { open, close }] = useDisclosure(false);
    const [editMode, setEdit] = useState(false);
    const [profile, setProfile] = useState<any>({});

    useEffect(() => {
        console.log(user);
        getPatient(user.profileId).then((data) => {
            setProfile({ ...data, allergies: data.allergies ? JSON.parse(data.allergies) : null, chronicDisease: data.chronicDisease ? JSON.parse(data.chronicDisease) : null });
        }).catch((error) => {
            console.log(error);
        });
    }, [])

    const form = useForm<any>({
        initialValues: {
            dob: '',
            phone: '',
            address: '',
            aadharNo: '',
            bloodGroup: '',
            gender: '',
            allergies: [],
            chronicDisease: []
        },
        validate: {
            dob: (value) => !value ? 'Date of Birth is required' : undefined,
            phone: (value) => !value ? 'Phone number is required' : undefined,
            address: (value) => !value ? 'Address is required' : undefined,
            aadharNo: (value) => !value ? 'Aadhar number is required' : undefined,
            gender: (value) => !value ? 'Gender is required' : undefined,
        }
    });
    const handleEdit = () => {
        form.setValues({ ...profile, dob: profile.dob ? new Date(profile.dob) : undefined, chronicDisease: profile.chronicDisease ?? [], allergies: profile.allergies ?? [] });
        setEdit(true);
    }

    const handleSubmit = (val: any) => {
        let values = form.getValues();
        form.validate();
        if (!form.isValid()) return;
        console.log(values);
        updatePatient({ ...profile, ...values, allergies: values.allergies ? JSON.stringify(values.allergies) : null, chronicDisease: values.chronicDisease ? JSON.stringify(values.chronicDisease) : null }).then((data) => {
            successNotification("Profile updated successfully");
            setProfile({ ...profile, ...values });
            setEdit(false);
        }).catch((error) => {
            errorNotification(error.response.data.errorMessage);
        });
    }




    return (
        <div
            className='p-10'>
            <div className='flex justify-between items-center'>
                <div className='flex gap-5 items-center'>


                    <div className='flex flex-col items-center gap-3'>
                        <Avatar variant='filled' src="/avatar.png" size={150} alt="it's me" />

                        {editMode && <Button size='sm' onClick={open} variant='filled' >Upload</Button>}
                    </div>

                    <div className='flex flex-col gap-3'>
                        <div className='text-3xl font-medium text-neutral-900'>{user.name}</div>
                        <div className='text-xl text-neutral-700'>{user.email}</div>
                    </div>
                </div>
                {!editMode ? <Button type='button' size='lg' onClick={handleEdit} variant='filled' leftSection={<IconEdit />}  >Edit</Button> :
                    <Button onClick={handleSubmit} size='lg' type='submit' variant='filled'>Submit</Button>}
            </div>

            <Divider my='xl' />
            <div>
                <div className='text-2xl font-medium text-neutral-900 mb-5'>Personal Information</div>
                <Table striped
                    stripedColor='primary.1' verticalSpacing={"md"}
                    highlightOnHover
                    withRowBorders={false}
                >
                    <Table.Tbody className='[&>tr]:!mb-3 [&_td]:!w-1/2'>
                        <Table.Tr>
                            <Table.Td className='font-semibold text-xl'>Date of Birth</Table.Td>
                            {editMode ? <Table.Td className='text-xl'>
                                <DateInput  {...form.getInputProps('dob')} placeholder="Date of Birth"
                                /></Table.Td> : <Table.Td className='text-xl'>{formatDate(profile.dob) ?? "-"}</Table.Td>}
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td className="font-semibold text-xl">Phone Number</Table.Td>
                            {editMode ? (
                                <Table.Td className="text-xl">
                                    <PhoneInput  {...form.getInputProps('phone')}
                                        country="in"
                                        enableSearch={true}
                                        placeholder="Enter your phone number"
                                        inputStyle={{
                                            width: "100%",
                                            height: "44px",
                                            fontSize: "16px",
                                            borderRadius: "0.5rem",
                                            border: "1px solid var(--mantine-color-primary-4)",
                                            paddingLeft: "48px",
                                            outline: "none",

                                        }}
                                        buttonStyle={{
                                            border: "none",
                                            background: "transparent",
                                        }}
                                        dropdownStyle={{
                                            maxHeight: "250px",
                                            borderRadius: "0.5rem",
                                        }}
                                    />
                                </Table.Td>
                            ) : (
                                <Table.Td className="text-xl">{profile.phone ?? "-"}</Table.Td>
                            )}

                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td className='font-semibold text-xl'>Gender</Table.Td>
                            {editMode ? <Table.Td className='text-xl'><Select {...form.getInputProps('gender')}
                                data={genderOptions}
                                placeholder="Enter your gender"
                            /></Table.Td> : <Table.Td className='text-xl'>{profile.gender ?? "-"}</Table.Td>}
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td className='font-semibold text-xl'>Address</Table.Td>
                            {editMode ? <Table.Td className='text-xl'><TextInput
                                {...form.getInputProps('address')}
                                placeholder="Enter your address"
                            /></Table.Td> : <Table.Td className='text-xl'>{profile.address ?? "-"}</Table.Td>}
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td className='font-semibold text-xl'>Aadhar Number</Table.Td>
                            {editMode ? <Table.Td className='text-xl'><NumberInput {...form.getInputProps('aadharNo')} maxLength={12} hideControls={true} clampBehavior='strict' styles={{ input: { MozAppearance: "textfield" } }}
                                placeholder="Enter your aadhar number"
                            /></Table.Td> : <Table.Td className='text-xl'>{profile.aadharNo ?? "-"}</Table.Td>}
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td className='font-semibold text-xl'>Blood Group</Table.Td>
                            {editMode ? <Table.Td className='text-xl'><Select {...form.getInputProps('bloodGroup')}
                                data={bloodGroups}
                            /></Table.Td> : <Table.Td className='text-xl'>{bloodGroupLabels[profile.bloodGroup] ?? "-"}</Table.Td>}
                        </Table.Tr>

                        <Table.Tr>
                            <Table.Td className='font-semibold text-xl'>Allergies</Table.Td>
                            {editMode ? <Table.Td className='text-xl'><TagsInput {...form.getInputProps('allergies')} placeholder='Enter your allergies'
                            /></Table.Td> : <Table.Td className='text-xl'>{arrayToCSV(profile.allergies) ?? "-"}</Table.Td>}
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td className='font-semibold text-xl'>Chronic Diseases</Table.Td>
                            {editMode ? <Table.Td className='text-xl'><TagsInput {...form.getInputProps('chronicDisease')}
                                placeholder="Enter your chronic diseases"
                            /></Table.Td> : <Table.Td className='text-xl'>{arrayToCSV(profile.chronicDisease) ?? "-"}</Table.Td>}
                        </Table.Tr>
                    </Table.Tbody>
                </Table>
            </div>
            <Modal opened={opened} onClose={close} title={<span className='text-lg font-medium'>Upload Profile Picture</span>} centered>

            </Modal>
        </div>
    )
}

export default Profile