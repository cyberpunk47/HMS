import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { getAllMedicines } from '../../../Service/MedicineService';
import { Pill } from 'lucide-react';

const Medicines = () => {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        getAllMedicines()
            .then((res) => {
                setData(res);
            })
            .catch((err) => {
                console.error("error fetching medicines: ", err);
            });
    }, []);

    const lowStockMeds = data.filter((m) => m.stock < 20);

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Medicines</CardTitle>
                        <CardDescription>Inventory overview</CardDescription>
                    </div>
                    {lowStockMeds.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {lowStockMeds.length} low stock
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                        {data.map((med, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                                        <Pill className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{med.name}</p>
                                        <p className="text-xs text-gray-500">{med.manufacturer}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-700">{med.dosage}</p>
                                    <Badge
                                        variant={med.stock < 20 ? "destructive" : "secondary"}
                                        className="text-[10px] mt-0.5"
                                    >
                                        Stock: {med.stock}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-sm text-gray-400">
                        No medicines found
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Medicines;