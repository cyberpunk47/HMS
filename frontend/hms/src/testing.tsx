// app/page.tsx (or your main dashboard route)
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Pill,
  Package,
  Receipt,
  LogOut,
  Calendar,
  HeartPulse,
  ChevronDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Sample data
const reasonDistribution = [
  { name: "Disease A", value: 75, color: "#0d9488" }, // teal-600
  { name: "Disease B", value: 25, color: "#94a3b8" }, // slate-400
];

const recentAppointments = [
  { id: 1, patient: "Emily Johnson", doctor: "Dr. Smith", time: "09:00 AM", status: "Confirmed" },
  { id: 2, patient: "Michael Chen", doctor: "Dr. Lee", time: "10:30 AM", status: "Pending" },
  { id: 3, patient: "Sarah Williams", doctor: "Dr. Patel", time: "11:45 AM", status: "Completed" },
  { id: 4, patient: "James Brown", doctor: "Dr. Smith", time: "02:00 PM", status: "Confirmed" },
];

const medicineStock = {
  name: "Paracetamol",
  dosage: "50 mg",
  manufacturer: "Cipla",
  stock: 3,
};

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-teal-600">Pulse</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={Users} label="Patients" />
          <NavItem icon={Stethoscope} label="Doctors" />
          <NavItem icon={Pill} label="Medicine" />
          <NavItem icon={Package} label="Inventory" />
          <NavItem icon={Receipt} label="Sales" />
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600">
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="relative w-96">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." className="pl-8" />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Calendar size={18} />
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-teal-100 text-teal-700">AD</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">Admin</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <div className="p-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Appointments" value="24" icon={Calendar} trend="+12% from last week" />
            <StatCard title="Patients" value="1,234" icon={Users} trend="+8% from last month" />
            <StatCard title="Doctors" value="18" icon={Stethoscope} trend="+2 this quarter" />
          </div>

          {/* Middle row: Pie chart + Medicine card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reason Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Reason Distribution</CardTitle>
                <CardDescription>Patient visit reasons</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {reasonDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Medicine stock card */}
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alert</CardTitle>
                <CardDescription>Medicine inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-semibold">{medicineStock.name}</p>
                    <p className="text-sm text-gray-500">{medicineStock.dosage} • {medicineStock.manufacturer}</p>
                    <Badge variant="destructive" className="mt-2">Stock: {medicineStock.stock} units</Badge>
                  </div>
                  <HeartPulse className="h-12 w-12 text-teal-500" />
                </div>
                <Button variant="outline" className="w-full mt-4">Reorder Medicine</Button>
              </CardContent>
            </Card>
          </div>

          {/* Today's Appointments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Appointments</CardTitle>
              <CardDescription>Scheduled for today</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">{apt.patient}</TableCell>
                      <TableCell>{apt.doctor}</TableCell>
                      <TableCell>{apt.time}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            apt.status === "Confirmed"
                              ? "default"
                              : apt.status === "Pending"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {apt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Helper components
function NavItem({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={`w-full justify-start gap-3 ${active ? "bg-teal-50 text-teal-700" : ""}`}
    >
      <Icon size={18} /> {label}
    </Button>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string; value: string; icon: any; trend: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-green-600 mt-1">{trend}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
            <Icon className="h-6 w-6 text-teal-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}