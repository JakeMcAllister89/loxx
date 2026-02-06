import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Building, Mail, MapPin, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your profile and preferences</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><User className="h-5 w-5" />Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input defaultValue="John" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input defaultValue="Smith" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input defaultValue="john@university.ac.uk" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Organisation</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input defaultValue="University of Oxford" className="pl-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><MapPin className="h-5 w-5" />Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input placeholder="123 University Road" />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input placeholder="Facilities Department" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="Oxford" />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input placeholder="OX1 2JD" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input defaultValue="United Kingdom" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="hero" onClick={() => toast.success('Settings saved')} size="lg">
          <Save className="h-4 w-4 mr-2" />Save Changes
        </Button>
      </div>
    </DashboardLayout>
  );
}
