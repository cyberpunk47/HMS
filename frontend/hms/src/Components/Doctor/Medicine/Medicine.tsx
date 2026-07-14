import { ActionIcon, Button, Fieldset, NumberInput, SegmentedControl, Select, TextInput } from "@mantine/core";
import { medicineCategories, medicineTypes } from "../../../data/DropdownData";
import { IconEdit, IconLayoutGrid, IconSearch, IconTable, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { errorNotification, successNotification } from "../../../Utility/NotificationUtil";
import { useEffect, useState } from "react";
import { DataTable, type DataTableFilterMeta } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import { formatDate } from "../../../Utility/DateUtility";
import { addMedicine, getAllMedicines, updateMedicine } from "../../../Service/MedicineService";
import { capitalizeFirstLetter } from "../../../Utility/OtherUtility";
import { Toolbar } from "primereact/toolbar";
import MedCard from "./MedCard";

type Medicine = {
    name: string,
    medicineId?: number,
    dosage: string,
    frequency: string,
    duration: number, // in days
    route: string, // ex: oral, intravenous
    type: string, // ex: tablet, syrup, injection
    instructions: string,
    prescriptionId?: number
}

const Medicine = () => {
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },

    });
    const [globalFilterValue, setGlobalFilterValue] = useState<string>('');

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters: any = { ...filters }

        _filters['global'].value = value;

        setFilters(_filters)
        setGlobalFilterValue(value);
    };
    const [data, setData] = useState<any[]>([])
    const [view, setView] = useState("table")
    const [sortField, setSortField] = useState<string>("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [edit, setEdit] = useState<boolean>(false)
    const [loading, setLoading] = useState(false);
    const form = useForm({
        initialValues: {
            id: null,
            name: '',
            dosage: '',
            category: "",
            type: "",
            manufacturer: "",
            unitPrice: "",

        },
        validate: {
            name: (value) => (value ? null : "Name is required"),
            dosage: (value) => (value ? null : "Dosage is required"),
            category: (value) => (value ? null : "Category is required"),
            type: (value) => (value ? null : "Type is required"),
            manufacturer: (value) => (value ? null : "Manufacturer is required"),
            unitPrice: (value) => (value ? null : "Unit Price is required"),

        }
    })

    useEffect(() => {
        fetchData();
    }, [])

    const fetchData = () => {
        getAllMedicines().then((res) => {
            // console.log("Reports Data: ", res)
            setData(res);
        }).catch((err) => {
            console.error("error fetching reports: ", err);
        })


    }



    const onEdit = (rowData: any) => {
        setEdit(true);
        form.setValues({
            id: rowData.id,
            name: rowData.name || '',
            dosage: rowData.dosage || '',
            category: rowData.category || '',
            type: rowData.type || '',
            manufacturer: rowData.manufacturer || '',
            unitPrice: rowData.unitPrice ?? '',
        })
    }
    const handleSubmit = (values: typeof form.values) => {
        // console.log(values)
        let update = false;
        let method;
        if (values.id) {
            update = true;
            method = updateMedicine
        } else {
            method = addMedicine;
        }

        setLoading(true)
        method(values).then((_res) => {
            successNotification(`Medicine ${update ? 'updated' : 'added'} successfully`)
            form.reset()
            setEdit(false)
            fetchData();
        }).catch((error) => {
            errorNotification(error?.response?.data?.errorMessage || `Failed to ${update ? 'update' : 'create'} Medicine`)
        }).finally(() => {
            setLoading(false)
        })
    }
    const renderHeader = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-between items-center">
                {

                    <Button variant="filled" onClick={() => setEdit(true)}>Add Medicine</Button>
                }
                <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />

            </div>
        );
    };

    const startToolbarTemplate = () => {
        return (
            <Button variant="filled" onClick={() => setEdit(true)} >Add Medicine</Button>
        )
    }

    const sortedData = [...data].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === "expDate") {
            const aDate = a.expDate ? new Date(a.expDate).getTime() : 0;
            const bDate = b.expDate ? new Date(b.expDate).getTime() : 0;
            return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
        }

        if (sortField === "expired") {
            const aExpired = a.expDate ? (new Date(a.expDate) < new Date()) : false;
            const bExpired = b.expDate ? (new Date(b.expDate) < new Date()) : false;
            if (aExpired === bExpired) return 0;
            if (aExpired) return sortOrder === "asc" ? 1 : -1;
            return sortOrder === "asc" ? -1 : 1;
        }

        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    const expiryBodyTemplate = (rowData: any) => {
        if (!rowData.expDate) return "N/A";
        const isExpired = new Date(rowData.expDate) < new Date();
        return (
            <span className={isExpired ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
                {formatDate(rowData.expDate)} {isExpired ? "(Expired)" : ""}
            </span>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-end items-center">
                <Select
                    placeholder="Sort by"
                    value={sortField}
                    onChange={(val) => val && setSortField(val)}
                    data={[
                        { value: "name", label: "Name" },
                        { value: "expDate", label: "Expiry Date" },
                        { value: "expired", label: "Expiration Status" }
                    ]}
                    style={{ width: 150 }}
                />
                <ActionIcon onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")} variant="light" size="lg">
                    {sortOrder === "asc" ? <IconArrowUp size={20} /> : <IconArrowDown size={20} />}
                </ActionIcon>
                <SegmentedControl
                    value={view}
                    color='primary'
                    onChange={setView}
                    data={[
                        { label: <IconTable />, value: 'table' },
                        { label: <IconLayoutGrid />, value: 'card' },
                    ]}
                />
                <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />

            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {

        return <div className='flex gap-2'>
            <ActionIcon>
                <IconEdit stroke={1.4} onClick={() => onEdit(rowData)} />
            </ActionIcon>
        </div>;
    };

    const cancel = () => {
        form.reset();
        setEdit(false);
    }
    const header = renderHeader()
    return (
        <div>
            {
                !edit ? <div><Toolbar className="mb-4 !p-1" end={rightToolbarTemplate} ></Toolbar>
                    {view == "table" ? <DataTable value={sortedData} stripedRows size='small' paginator rows={10}
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        rowsPerPageOptions={[10, 25, 50]} dataKey="id"

                        filters={filters} filterDisplay="menu" globalFilterFields={['name', 'manufacturer', 'category', 'type']}
                        emptyMessage="No Medicines found." currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries">
                        <Column field="name" header="Name" sortable />
                        <Column field="createdAt" header="Created Date" sortable body={(rowData) => formatDate(rowData.createdAt)} />
                        <Column field="dosage" header="Dosage" />
                        <Column field="stock" header="Stock" sortable />
                        <Column field="category" header="Category" body={rowData => capitalizeFirstLetter(rowData.category)} />
                        <Column field="type" header="Type" body={rowData => capitalizeFirstLetter(rowData.type)} />
                        <Column field="manufacturer" header="Manufacturer" />
                        <Column field="unitPrice" header="Unit Price ₹" sortable />
                        <Column field="expDate" header="Expiry Date" sortable body={expiryBodyTemplate} />
                        {/* <Column headerStyle={{ width: "5rem", textAlign: "center" }} bodyStyle={{ textAlign: "center", overflow: "visible" }} body={actionBodyTemplate} /> */}

                    </DataTable> : <div className='grid grid-cols-4 gap-5'>{
                        sortedData?.map((med) => (<MedCard key={med.id} {...med} />))
                    }{
                            sortedData.length === 0 && <div className='col-span-4 text-center text-gray-500'>No Medicines Found</div>
                        }</div>} </div> :
                    <form onSubmit={form.onSubmit(handleSubmit)} className="grid gap-5">
                        <Fieldset className="grid gap-4 grid-cols-2" legend={<span className="text-lg font-medium text-primary-500">Medicine information</span>} radius="md">

                            <TextInput {...form.getInputProps("name")} label="Medicine" placeholder="Enter Medicine name" withAsterisk />
                            <TextInput {...form.getInputProps("dosage")} label="Dosage" placeholder="Enter Dosage [50mg, 100mg etc]" />
                            <Select {...form.getInputProps("category")} label="Category" placeholder="Select Category" data={medicineCategories} />
                            <Select {...form.getInputProps("type")} label="Type" placeholder="Select Type" data={medicineTypes} />
                            <TextInput {...form.getInputProps("manufacturer")} label="Manufacturer" placeholder="Enter Manufacturer" withAsterisk />
                            <NumberInput {...form.getInputProps("unitPrice")} min={0} clampBehavior="strict" label="Unit Price" placeholder="Enter Unit Price" withAsterisk />

                        </Fieldset>

                        <div className="flex item-center gap-5 justify-center">
                            <Button loading={loading} type="submit" className="w-full" variant="filled" color="primary">{form.values?.id ? "Update" : "Add"} Medicine</Button>
                            <Button loading={loading} onClick={cancel} variant="filled" color="red">Cancel</Button>
                        </div>
                    </form >
            }


        </div>
    )
}


export default Medicine;