import { ActionIcon, Button, Fieldset, Group, MultiSelect, NumberInput, SegmentedControl, Select, Textarea, TextInput, type SelectProps } from "@mantine/core";
import { dosageFrequencies, medicalTests, medicineTypes, symptoms } from "../../../data/DropdownData";
import { IconCheck, IconLayoutGrid, IconSearch, IconTable, IconTrash } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { createAppointmentReport, getReportsByPatientId, isReportExists } from "../../../Service/AppointmentService";
import { errorNotification, successNotification } from "../../../Utility/NotificationUtil";
import { useEffect, useState } from "react";
import { DataTable, type DataTableFilterMeta } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import { formatDate } from "../../../Utility/DateUtility";
import { getAllMedicines } from "../../../Service/MedicineService";
import { Toolbar } from "primereact/toolbar";
import ReportCard from "./ReportCard";

type Medicine = {
    name: string,
    medicineId?: string | number | undefined,
    dosage: string,
    frequency: string,
    duration: number,
    route: string,
    type: string,
    instructions: string,
    prescriptionId?: number
}

const ApReport = ({ appointment }: any) => {
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
    const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
    const [data, setData] = useState<any[]>([]);
    const [allowAdd, setAllowAdd] = useState<boolean>(false);
    const [edit, setEdit] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [medicine, setMedicine] = useState<any[]>([]);
    const [view, setView] = useState("table");
    const [medicineMap, setMedicineMap] = useState<Record<string, any>>({});

    const form = useForm({
        initialValues: {
            symptoms: [],
            tests: [],
            diagnosis: "",
            referral: "",
            notes: "",
            prescription: {
                medicines: [] as Medicine[],
            }
        },
        validate: {
            symptoms: (value) => (value.length > 0 ? null : "Please select at least one symptom"),
            diagnosis: (value) => (value?.trim() ? null : "Diagnosis is required"),
            prescription: {
                medicines: {
                    name: value => (value?.trim() ? null : "Medicine is required"),
                    dosage: value => (value?.trim() ? null : "Dosage is required"),
                    frequency: value => (value ? null : "Frequency is required"),
                    duration: value => (value > 0 ? null : "Duration must be greater than zero"),
                    type: value => (value ? null : "Type is required"),
                    instructions: value => (value?.trim() ? null : "Instructions are required"),
                }
            }
        }
    });

    useEffect(() => {
        console.log("APREPORT APPOINTMENT:", appointment);
        console.log("PATIENT ID:", appointment?.patientId);
        console.log("APPOINTMENT ID:", appointment?.id);

        if (!appointment?.patientId) {
            console.log("NO PATIENT ID");
            setData([]);
            setAllowAdd(false);
            return;
        }

        getReportsByPatientId(appointment.patientId)
            .then((res) => {
                console.log("REPORT API RESPONSE:", res);
                setData(res);
            })
            .catch((err) => {
                console.error("REPORT API ERROR:", err);
                setData([]);
            });

        if (appointment.status === "SCHEDULED") {
            isReportExists(appointment.id)
                .then((res) => {
                    setAllowAdd(!res);
                })
                .catch((err) => {
                    console.error("REPORT EXISTS ERROR:", err);
                    setAllowAdd(false);
                });
        } else {
            setAllowAdd(false);
        }

    }, [appointment?.patientId, appointment?.id, appointment?.status]);

    useEffect(() => {
        getAllMedicines().then((res) => {
            setMedicine(res);
            setMedicineMap(res.reduce((acc: any, item: any) => {
                acc[item.id] = item;
                return acc;
            }, {}));
        }).catch((err) => {
            console.error("error fetching medicines: ", err);
        });
    }, []);

    const fetchData = () => {
        if (!appointment?.patientId) {
            setData([]);
            setAllowAdd(false);
            return;
        }

        getReportsByPatientId(appointment.patientId)
            .then((res) => {
                setData(res);
            })
            .catch((err) => {
                console.error("error fetching reports: ", err);
            });

        if (appointment?.status === 'COMPLETED') {
            isReportExists(appointment.id)
                .then((res) => {
                    setAllowAdd(!res);
                })
                .catch((err) => {
                    console.error("error on reporting existence: ", err);
                    setAllowAdd(false);
                });
        } else {
            setAllowAdd(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters: any = { ...filters };
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const insertMedicine = () => {
        form.insertListItem("prescription.medicines", {
            name: "",
            dosage: "",
            frequency: "",
            duration: 0,
            route: "",
            type: "",
            instructions: ""
        });
    };

    const removeMedicine = (index: number) => {
        form.removeListItem("prescription.medicines", index);
    };

    const renderSelectOption: SelectProps['renderOption'] = ({ option, checked }: any) => (
        <Group flex="1" gap="xs">
            <div className="flex gap-2 items-center">
                {option.label}
                {option?.manufacturer && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8em', color: 'gray' }}>
                        {option.manufacturer} - {option.dosage}
                    </span>
                )}
            </div>
            {checked && <IconCheck style={{ marginInlineStart: 'auto' }} />}
        </Group>
    );

    const handleSubmit = (values: typeof form.values) => {
        let data = {
            ...values,
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            prescription: {
                medicines: values.prescription.medicines.map(med => ({
                    ...med,
                    medicineId: med.medicineId === "OTHER" ? null : med.medicineId
                })),
                doctorId: appointment.doctorId,
                patientId: appointment.patientId,
                appointmentId: appointment.id,
            }
        };

        setLoading(true);
        createAppointmentReport(data).then((res) => {
            successNotification("Report created successfully");
            form.reset();
            setEdit(false);
            setAllowAdd(false);
            fetchData();
        }).catch((error) => {
            errorNotification(error?.response?.data?.errorMessage || "Failed to create report");
        }).finally(() => {
            setLoading(false);
        });
    };

    const handleChangeMed = (medId: any, index: number) => {
        if (medId && medId != "OTHER") {
            form.setFieldValue(`prescription.medicines.${index}.medicineId`, medId);
            form.setFieldValue(`prescription.medicines.${index}.name`, medicineMap[medId]?.name || '');
            form.setFieldValue(`prescription.medicines.${index}.dosage`, medicineMap[medId]?.dosage || '');
            form.setFieldValue(`prescription.medicines.${index}.type`, medicineMap[medId]?.type || '');
        } else {
            form.setFieldValue(`prescription.medicines.${index}.medicineId`, "OTHER");
            form.setFieldValue(`prescription.medicines.${index}.name`, '');
            form.setFieldValue(`prescription.medicines.${index}.dosage`, '');
            form.setFieldValue(`prescription.medicines.${index}.type`, '');
        }
    };

    const startToolbarTemplate = () => {
        return allowAdd && (
            <Button variant="filled" onClick={() => setEdit(true)}>
                Add Report
            </Button>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-end items-center">
                <SegmentedControl
                    value={view}
                    color='primary'
                    onChange={setView}
                    data={[
                        { label: <IconTable />, value: 'table' },
                        { label: <IconLayoutGrid />, value: 'card' },
                    ]}
                />
                <TextInput
                    leftSection={<IconSearch />}
                    fw={500}
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Keyword Search"
                />
            </div>
        );
    };

    return (
        <div>
            {!edit ? (
                <div>
                    <Toolbar className="mb-4 !p-1" start={startToolbarTemplate} end={rightToolbarTemplate}></Toolbar>

                    {view == "table" ? (
                        <DataTable
                            value={data}
                            stripedRows
                            size='small'
                            paginator
                            rows={10}
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            rowsPerPageOptions={[10, 25, 50]}
                            dataKey="id"
                            filters={filters}
                            filterDisplay="menu"
                            globalFilterFields={['doctorName', 'notes']}
                            emptyMessage="No Report found."
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                        >
                            <Column field="doctorName" header="Doctor" />
                            <Column field="diagnosis" header="Diagnosis" />
                            <Column
                                field="reportDate"
                                header="Report Date"
                                sortable
                                body={(rowData) => formatDate(rowData.createdAt)}
                            />
                            <Column field="notes" header="Notes" />
                        </DataTable>
                    ) : (
                        <div className='grid grid-cols-4 gap-5'>
                            {data?.map((report) => (
                                <ReportCard key={report.id} {...report} />
                            ))}
                            {data.length === 0 && (
                                <div className='col-span-4 text-center text-gray-500'>No Reports Found</div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={form.onSubmit(handleSubmit)} className="grid gap-5">
                    <Fieldset className="grid gap-4 grid-cols-2" legend={<span className="text-lg font-medium text-primary-500">Report Information</span>} radius="md">
                        <MultiSelect
                            {...form.getInputProps("symptoms")}
                            className="col-span-2"
                            withAsterisk
                            label="Symptoms"
                            placeholder="Pick symptoms"
                            data={symptoms}
                        />
                        <MultiSelect
                            {...form.getInputProps("tests")}
                            className="col-span-2"
                            label="Medical Tests"
                            placeholder="Pick tests"
                            data={medicalTests}
                        />
                        <TextInput
                            {...form.getInputProps("diagnosis")}
                            label="Diagnosis"
                            placeholder="Enter Diagnosis"
                            withAsterisk
                        />
                        <TextInput
                            {...form.getInputProps("referral")}
                            label="Referral"
                            placeholder="Enter Referral Details"
                        />
                        <Textarea
                            {...form.getInputProps("notes")}
                            className="col-span-2"
                            label="Notes"
                            placeholder="Enter any additional notes"
                        />
                    </Fieldset>

                    <Fieldset className="grid gap-5" legend={<span className="text-lg font-medium text-primary-500">Prescription</span>} radius="md">
                        {form.values.prescription.medicines.map((med: Medicine, index: number) => (
                            <Fieldset key={index} className="grid col-span-2 gap-4 grid-cols-2">
                                <div className="flex col-span-2 items-center justify-between">
                                    <h1 className="text-lg font-medium">Medicine {index + 1}</h1>
                                    <ActionIcon
                                        onClick={() => removeMedicine(index)}
                                        variant="filled"
                                        color="red"
                                        size={'lg'}
                                    >
                                        <IconTrash />
                                    </ActionIcon>
                                </div>

                                <Select
                                    renderOption={renderSelectOption}
                                    {...form.getInputProps(`prescription.medicines.${index}.medicineId`)}
                                    label="Medicine"
                                    placeholder="Select Medicine"
                                    onChange={(value: any) => handleChangeMed(value, index)}
                                    data={[
                                        ...medicine.filter((x: any) =>
                                            !form.values.prescription.medicines.some((item1: any, idx) =>
                                                item1.medicineId == x.id && idx != index
                                            )
                                        ).map(item => ({ ...item, value: "" + item.id, label: item.name })),
                                        { label: "Other", value: "OTHER" }
                                    ]}
                                    withAsterisk
                                />

                                {med.medicineId == "OTHER" && (
                                    <TextInput
                                        {...form.getInputProps(`prescription.medicines.${index}.name`)}
                                        label="Medicine Name"
                                        placeholder="Enter Medicine name"
                                        withAsterisk
                                    />
                                )}

                                <TextInput
                                    disabled={med.medicineId != "OTHER"}
                                    {...form.getInputProps(`prescription.medicines.${index}.dosage`)}
                                    label="Dosage"
                                    placeholder="Enter dosage"
                                    withAsterisk
                                />
                                <Select
                                    {...form.getInputProps(`prescription.medicines.${index}.frequency`)}
                                    label="Frequency"
                                    placeholder="Select frequency"
                                    withAsterisk
                                    data={dosageFrequencies}
                                />
                                <NumberInput
                                    {...form.getInputProps(`prescription.medicines.${index}.duration`)}
                                    label="Duration (days)"
                                    placeholder="Enter the duration in days"
                                    withAsterisk
                                />
                                <Select
                                    {...form.getInputProps(`prescription.medicines.${index}.type`)}
                                    label="Type"
                                    placeholder="Select Type"
                                    withAsterisk
                                    data={medicineTypes}
                                    disabled={med.medicineId != "OTHER"}
                                />
                                <TextInput
                                    {...form.getInputProps(`prescription.medicines.${index}.instructions`)}
                                    label="Instructions"
                                    placeholder="Enter Instructions"
                                    withAsterisk
                                />
                            </Fieldset>
                        ))}

                        <div className="flex items-start col-span-2 justify-center">
                            <Button onClick={insertMedicine} variant="outline" color="primary">
                                Add Medicine
                            </Button>
                        </div>
                    </Fieldset>

                    <div className="flex item-center gap-5 justify-center">
                        <Button loading={loading} type="submit" className="w-full" variant="filled" color="primary">
                            Submit Report
                        </Button>
                        <Button
                            variant="filled"
                            color="red"
                            onClick={() => {
                                setEdit(false);
                                form.reset();
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ApReport;