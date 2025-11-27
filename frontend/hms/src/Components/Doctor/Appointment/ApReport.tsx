import { ActionIcon, Button, Fieldset, MultiSelect, NumberInput, Select, Textarea, TextInput } from '@mantine/core'
import  { useEffect, useState } from 'react'
import { dosageFrequencies, symptoms, test } from '../../../Data/DropdownData'
import { IconEye, IconSearch, IconTrash } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { createAppointmentReport, getReportsByPatientId, isReportExists } from '../../../Service/AppointmentService'
import { errorNotification, successNotification } from '../../../Utility/NotificationUtil'
import { useDispatch } from 'react-redux'
import { DataTable, DataTableFilterMeta } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { FilterMatchMode } from 'primereact/api'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../../../Utility/DateUtility'

type Medicine = {
  name: string;
  medicineId?: number;
  dosage: string;
  frequency: string;
  duration: number;
  route: string;
  type: string;
  instructions: string;
  prescriptionId?: number;
}

const ApReport = ({ appointment }: any) => {
  const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS }});
    const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            let _filters: any = { ...filters };
    
            _filters['global'].value = value;
    
            setFilters(_filters);
            setGlobalFilterValue(value);
        };
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]); 
  const [allowAdd, setAllowAdd] = useState<boolean>(false);
  const [edit, setEdit] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: {
      symptoms: [],
      tests: [],
      diagnosis: '',
      notes: '',
      prescription: {
        medicines: [] as Medicine[],
        notes: ''
      },
      referral: ''

    },
    validate: {
      symptoms: (value: string[]) => (value.length > 0 ? null : 'Select at least one symptom'),

      diagnosis: (value: string) => (value?.trim() ? null : 'Diagnosis is required'),

      prescription: {
        medicines: {
          name: (value: string) => (value?.trim() ? null : 'Medicine name is required'),
          dosage: (value: string) => (value?.trim() ? null : 'Dosage is required'),
          frequency: (value: string) => (value ? null : 'Frequency is required'),
          duration: (value: number) => (value > 0 ? null : 'Duration should be greater than 0'),

          route: (value: string) => (value ? null : 'Route is required'),
          type: (value: string) => (value ? null : 'Type is required'),
          instructions: (value: string) => (value?.trim() ? null : 'Instructions are required')
        }
      }
    }
  });
  const insertMedicine = () => {
    form.insertListItem('prescription.medicines', { name: '', dosage: '', frequency: '', duration: 0, route: '', type: '', instructions: '' });
  }
  const removeMedicine = (index: number) => {
    form.removeListItem('prescription.medicines', index);
  }
  useEffect(()=>{
    fetchData();
  },[appointment?.patientId, appointment.id]);

  const fetchData =()=>{
 if (!appointment?.patientId) return;
    getReportsByPatientId(appointment?.patientId).then((res)=>{
        console.log("Reports: ", res);
        setData(res);
    }).catch((err)=>{
        console.log("Error fetching reports: ", err);
    });
    isReportExists(appointment.id).then((res)=>{
      setAllowAdd(!res);
      console.log("Report existence: ", res);
    }).catch((err)=>{
      console.log("Error checking report existence: ", err);
      setAllowAdd(true);
    });
  }
  const handleSubmit = (values: typeof form.values) => {
    let data = {
      ...values,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      prescription: {
        ...values.prescription,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        appointmentId: appointment.id,
      }
    }
    console.log("Form Values: ", data);

    setLoading(true);
    createAppointmentReport(data).then((res) => {
      successNotification("Report created successfully");
      form.reset();
      setEdit(false);
      setAllowAdd(false);
      fetchData();
    }).catch((err) => {
      errorNotification(err?.response?.data?.errorMessage || "Failed to create report");
    }).finally(() => {
      setLoading(false);
    });
  }
  const renderHeader = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-between items-center">
                { allowAdd && <Button variant='filled'onClick={()=>{
                  setEdit(true)
                }} >Add Report</Button>}
                <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        return <div className='flex gap-2 justify-center'>
            {/* <ActionIcon onClick={() => navigate("/doctor/appointments/"+rowData.appointmentId)}>
                <IconEye size={20} stroke={1.5} />
            </ActionIcon> */}
        </div>;
    };
    const header = renderHeader();
  return (
    <div>
      {!edit ? <DataTable header={renderHeader()} stripedRows value={data} size='small' paginator rows={10}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        rowsPerPageOptions={[10, 25, 50]} dataKey="id"

        filters={filters} filterDisplay="menu" globalFilterFields={['doctorName', 'notes']}
        emptyMessage="No appointment found." currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries">

        <Column field="doctorName" header="Doctor" />
        
        <Column field='diagnosis' header="Diagnosis" />

        <Column field="reportDate" header="Report Date" sortable body={(rowData) => formatDate(rowData.createdAt)} />


        <Column field="notes" header="Notes"/>

        <Column headerStyle={{ width: '5rem', textAlign: 'center' }} bodyStyle={{ textAlign: 'center', overflow: 'visible' }} body={actionBodyTemplate} />
      </DataTable>
      :< form onSubmit={form.onSubmit(handleSubmit)} className='grid gap-5'>
        <Fieldset className='grid gap-4 grid-cols-2' legend={<span className='text-lg '>Personal information</span>} radius="md">
          <MultiSelect {...form.getInputProps('symptoms')} className='col-span-2' withAsterisk label="Symptoms" placeholder="Pick symptoms" data={symptoms} searchable />
          <MultiSelect {...form.getInputProps('tests')} className='col-span-2' label="Tests" placeholder="Pick tests" data={test} searchable />
          <TextInput {...form.getInputProps('diagnosis')} withAsterisk label="Diagnosis" placeholder="Enter diagnosis" />
          <TextInput {...form.getInputProps('referral')} label="Referral" placeholder="Enter referral details" />
          <Textarea {...form.getInputProps('notes')}
            className='col-span-2'
            label="Notes"
            placeholder="Enter additional notes"
          />
        </Fieldset>
        <Fieldset className='grid gap-5' legend={<span className='text-lg font-medium text-primary-500'>Prescription</span>} radius="md">

          {form.values.prescription.medicines.map((_medicine, index) => (
            <Fieldset legend={<div className='flex col-span-2 items-center gap-5'>
              <h1 className='text-xl font-medium'>Medicine {index + 1}</h1>
              <ActionIcon onClick={() => removeMedicine(index)} variant='filled' color='red' size={'md'} className='mb-2'>
                <IconTrash />
              </ActionIcon>
            </div>} key={index} className='grid gap-4 col-span-2 grid-cols-2'>

              <TextInput {...form.getInputProps(`prescription.medicines.${index}.name`)} withAsterisk label="Medicine" placeholder="Enter medicine name" />
              <TextInput {...form.getInputProps(`prescription.medicines.${index}.dosage`)} label="Dosage" placeholder="Enter dosage" withAsterisk />
              <Select {...form.getInputProps(`prescription.medicines.${index}.frequency`)} label="Frequency" placeholder="Select frequency" data={dosageFrequencies} />
              <NumberInput {...form.getInputProps(`prescription.medicines.${index}.duration`)} withAsterisk label="Duration (days)" placeholder="Enter duration" />
              <Select {...form.getInputProps(`prescription.medicines.${index}.route`)} label="Route" placeholder="Select route" withAsterisk data={["Oral", "Intravenous", "Topical", "Inhalation"]} />
              {/* <TextInput
              label="Referral" placeholder="Enter referral details"
              withAsterisk
            /> */}
              <Select {...form.getInputProps(`prescription.medicines.${index}.type`)} label="Type" placeholder="Select type" withAsterisk data={["Tablet", "Syrup", "Injection", "Inhaler", "Ointment", "Capsule"]} />
              <TextInput {...form.getInputProps(`prescription.medicines.${index}.instructions`)} label="Instructions" placeholder="Enter instructions" withAsterisk />
            </Fieldset>
          ))}
          <div className='flex items-center col-span-2 justify-center'>
            <Button onClick={insertMedicine} className='col-span-2' variant='outline' color='primary'>Add Medicine</Button>
          </div>

        </Fieldset>
        <div className='flex items-center justify-center gap-5'>
          <Button variant='filled' type='submit' className='w-full' color='primary'>Submit Report</Button>
          <Button loading={loading} variant='filled' type='button' className='w-full' color='red'>Cancel</Button>
        </div>

      </form>}
    </div>
  )
}

export default ApReport


