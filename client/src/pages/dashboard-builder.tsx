import { useState, useEffect } from "react";
import RGL, { Layout } from "react-grid-layout";
import { 
  BarChart3, 
  PieChart, 
  LineChart as LineChartIcon, 
  Type, 
  Image as ImageIcon,
  Save,
  Settings,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

// Workaround for WidthProvider import issues in some environments
const WidthProvider = (RGL as any).WidthProvider;
const ReactGridLayout = WidthProvider ? WidthProvider(RGL) : RGL;

// Mock Data for Charts
const CHART_DATA = [
  { name: 'Jan', revenue: 4000, cost: 2400, amt: 2400 },
  { name: 'Feb', revenue: 3000, cost: 1398, amt: 2210 },
  { name: 'Mar', revenue: 2000, cost: 9800, amt: 2290 },
  { name: 'Apr', revenue: 2780, cost: 3908, amt: 2000 },
  { name: 'May', revenue: 1890, cost: 4800, amt: 2181 },
  { name: 'Jun', revenue: 2390, cost: 3800, amt: 2500 },
];

type WidgetType = 'line' | 'bar' | 'stat' | 'text';

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
}

export default function DashboardBuilder() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [layout, setLayout] = useState<any[]>([
    { i: '1', x: 0, y: 0, w: 8, h: 4 },
    { i: '2', x: 8, y: 0, w: 4, h: 4 },
    { i: '3', x: 0, y: 4, w: 4, h: 3 },
    { i: '4', x: 4, y: 4, w: 8, h: 3 },
  ]);

  const [widgets, setWidgets] = useState<Widget[]>([
    { id: '1', type: 'line', title: 'Revenue Trend' },
    { id: '2', type: 'stat', title: 'Total Users' },
    { id: '3', type: 'bar', title: 'Sales by Region' },
    { id: '4', type: 'text', title: 'Q1 Summary Notes' },
  ]);

  const renderWidgetContent = (widget: Widget) => {
    switch (widget.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="cost" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'stat':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-4xl font-bold font-display text-primary">14,293</div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-medium">+12%</span> vs last month
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="p-2 text-sm text-muted-foreground leading-relaxed">
            <p>Q1 performance exceeded expectations due to the new enterprise tier launch.</p>
            <ul className="list-disc pl-4 mt-2 space-y-1">
               <li>North region up 20%</li>
               <li>Churn reduced by 5%</li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar - Widget Palette */}
      <div className="w-60 shrink-0 flex flex-col gap-4">
         <Card className="flex-1">
            <CardHeader className="pb-3">
               <CardTitle className="text-sm font-medium">Widgets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
               <div className="p-3 bg-secondary/50 rounded-lg border border-dashed cursor-move hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-3">
                  <LineChartIcon className="size-4 text-primary" />
                  <span className="text-sm font-medium">Line Chart</span>
               </div>
               <div className="p-3 bg-secondary/50 rounded-lg border border-dashed cursor-move hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-3">
                  <BarChart3 className="size-4 text-chart-2" />
                  <span className="text-sm font-medium">Bar Chart</span>
               </div>
               <div className="p-3 bg-secondary/50 rounded-lg border border-dashed cursor-move hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-3">
                  <PieChart className="size-4 text-chart-3" />
                  <span className="text-sm font-medium">Pie Chart</span>
               </div>
               <div className="p-3 bg-secondary/50 rounded-lg border border-dashed cursor-move hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-3">
                  <div className="font-bold text-xs border rounded px-1">123</div>
                  <span className="text-sm font-medium">Statistic</span>
               </div>
               <div className="p-3 bg-secondary/50 rounded-lg border border-dashed cursor-move hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-3">
                  <Type className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Text Block</span>
               </div>
            </CardContent>
         </Card>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/30 rounded-xl border border-dashed overflow-hidden relative">
         <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button size="sm" variant="secondary">
               <Settings className="mr-2 size-4" />
               Settings
            </Button>
            <Button size="sm">
               <Save className="mr-2 size-4" />
               Save Layout
            </Button>
         </div>

         <ScrollArea className="flex-1 p-6">
            <ReactGridLayout
              className="layout min-h-[800px]"
              layout={layout}
              cols={12}
              rowHeight={60}
              width={1000} // This would ideally be responsive
              onLayoutChange={(newLayout: any) => setLayout(newLayout)}
              draggableHandle=".drag-handle"
            >
              {layout.map((item) => {
                const widget = widgets.find(w => w.id === item.i);
                if (!widget) return null;

                return (
                  <div key={item.i} className="bg-card border rounded-lg shadow-sm flex flex-col group overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all">
                    <div className="drag-handle h-8 px-3 border-b bg-muted/30 flex items-center justify-between cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{widget.title}</span>
                       <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                             <Settings className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                             <Trash2 className="size-3" />
                          </Button>
                       </div>
                    </div>
                    <div className="flex-1 p-4 min-h-0">
                       {renderWidgetContent(widget)}
                    </div>
                  </div>
                );
              })}
            </ReactGridLayout>
         </ScrollArea>
      </div>

      {/* Right Properties Panel */}
      <div className="w-72 shrink-0 hidden 2xl:block">
         <Card className="h-full">
            <CardHeader>
               <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-sm text-muted-foreground text-center py-10">
                  Select a widget to edit its properties
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
