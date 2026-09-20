import { ActionIcon, Badge, Button, Divider, Fieldset, Group, Loader, Modal, MultiSelect, NumberInput, SegmentedControl, Select, SimpleGrid, Text, Textarea, TextInput, type SelectProps } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { dosageFrequencies, medicalTests, medicineTypes, symptoms } from "../../../data/DropdownData";
import { IconCheck, IconEye, IconLayoutGrid, IconSearch, IconTable, IconTrash } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { createAppointmentReport, getReportDetailsByAppointmentId, getReportsByPatientId, isReportExists } from "../../../Service/AppointmentService";
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

const ApReport = ({ appointment, onReportCreated }: any) => {
    const queryClient = useQueryClient();
    // Full report + prescription shown in a modal (the table only has summary fields).
    const [viewing, setViewing] = useState<any>(null);
    const [viewDetails, setViewDetails] = useState<any>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const openReport = (report: any) => {
        setViewing(report);
        setViewDetails(null);
        if (!report?.appointmentId) return;
        setViewLoading(true);
        getReportDetailsByAppointmentId(report.appointmentId)
            .then((res) => setViewDetails(res))
            .catch(() => setViewDetails(null))
            .finally(() => setViewLoading(false));
    };
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
            followUpDate: null as string | null,
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
        fetchData();
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
                setData(res || []);
            })
            .catch((err) => {
                console.error("error fetching reports: ", err);
                setData([]);
            });

        // A report can be added only while the appointment is SCHEDULED; creating it completes the
        // appointment (backend also rejects appointments more than 1 hour in the future).
        if (appointment?.status === 'SCHEDULED') {
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
            followUpDate: values.followUpDate ? dayjs(values.followUpDate).format("YYYY-MM-DD") : null,
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
            // Refresh medical history / prescriptions views and the appointment status (now COMPLETED).
            queryClient.invalidateQueries({ queryKey: ["patientReports", appointment.patientId] });
            queryClient.invalidateQueries({ queryKey: ["patientPrescriptions", appointment.patientId] });
            queryClient.invalidateQueries({ queryKey: ["patientAppointments", appointment.patientId] });
            onReportCreated?.();
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
                            globalFilterFields={['doctorName', 'notes', 'diagnosis', 'referral']}
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
                            <Column
                                header="Symptoms"
                                body={(rowData) => (rowData.symptoms || []).join(", ")}
                            />
                            <Column
                                header="Follow-up"
                                body={(rowData) => formatDate(rowData.followUpDate) || "—"}
                            />
                            <Column field="notes" header="Notes" />
                            <Column
                                headerStyle={{ width: "4rem" }}
                                body={(rowData) => (
                                    <ActionIcon variant="subtle" onClick={() => openReport(rowData)} title="View full report">
                                        <IconEye size={18} />
                                    </ActionIcon>
                                )}
                            />
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
                        <DateInput
                            {...form.getInputProps("followUpDate")}
                            label="Follow-up Date"
                            placeholder="Optional"
                            clearable
                            minDate={dayjs().format("YYYY-MM-DD")}
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

            <Modal opened={!!viewing} onClose={() => setViewing(null)} size="lg" centered
                title={<Text fw={600}>Report — {formatDate(viewing?.createdAt)}</Text>}>
                {viewing && (
                    <div className="flex flex-col gap-3">
                        <SimpleGrid cols={2} spacing="xs">
                            <div><Text size="xs" c="dimmed">Doctor</Text><Text size="sm">{viewing.doctorName}</Text></div>
                            <div><Text size="xs" c="dimmed">Diagnosis</Text><Text size="sm">{viewing.diagnosis || "—"}</Text></div>
                            <div><Text size="xs" c="dimmed">Referral</Text><Text size="sm">{viewing.referral || "—"}</Text></div>
                            <div><Text size="xs" c="dimmed">Follow-up</Text><Text size="sm">{formatDate(viewing.followUpDate) || "—"}</Text></div>
                        </SimpleGrid>
                        <div>
                            <Text size="xs" c="dimmed">Symptoms</Text>
                            <Group gap={4}>{(viewing.symptoms || []).map((x: string) => <Badge key={x} variant="light">{x}</Badge>)}</Group>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed">Tests</Text>
                            <Group gap={4}>{(viewing.tests || []).length ? viewing.tests.map((x: string) => <Badge key={x} color="grape" variant="light">{x}</Badge>) : <Text size="sm">—</Text>}</Group>
                        </div>
                        <div><Text size="xs" c="dimmed">Notes</Text><Text size="sm">{viewing.notes || "—"}</Text></div>
                        <Divider label="Prescription" labelPosition="left" />
                        {viewLoading && <Loader size="sm" />}
                        {!viewLoading && (viewDetails?.prescription?.medicines?.length ? (
                            viewDetails.prescription.medicines.map((m: any, i: number) => (
                                <Text size="sm" key={m.id ?? i}>
                                    <b>{m.name}</b> {m.dosage} · {m.frequency} · {m.duration} days{m.route ? ` · ${m.route}` : ""}{m.instructions ? ` · ${m.instructions}` : ""}
                                </Text>
                            ))
                        ) : <Text size="sm" c="dimmed">No medicines prescribed.</Text>)}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ApReport;