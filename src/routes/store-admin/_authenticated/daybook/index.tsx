/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Route = createFileRoute('/store-admin/_authenticated/daybook/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <Tabs defaultValue="seed" className="w-full max-w-7xl">
        <TabsList>
          <TabsTrigger value="seed">Seed</TabsTrigger>
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
          <TabsTrigger value="dispatch-pre-outgoing">
            Dispatch (Pre outgoing)
          </TabsTrigger>
          <TabsTrigger value="dispatch-outgoing">
            Dispatch (Outgoing)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="seed">
          <Card>
            <CardHeader>
              <CardTitle>Seed</CardTitle>
              <CardDescription>
                Manage daybook entries for seed procurement, inventory, and
                usage.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Seed tab content will appear here.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="incoming">
          <Card>
            <CardHeader>
              <CardTitle>Incoming</CardTitle>
              <CardDescription>
                Record incoming material details and verify received quantities.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Incoming tab content will appear here.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="grading">
          <Card>
            <CardHeader>
              <CardTitle>Grading</CardTitle>
              <CardDescription>
                Track quality grades and related grading observations.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Grading tab content will appear here.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="dispatch-pre-outgoing">
          <Card>
            <CardHeader>
              <CardTitle>Dispatch (Pre outgoing)</CardTitle>
              <CardDescription>
                Prepare dispatch records before goods move out.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Dispatch (Pre outgoing) tab content will appear here.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="dispatch-outgoing">
          <Card>
            <CardHeader>
              <CardTitle>Dispatch (Outgoing)</CardTitle>
              <CardDescription>
                Finalize outgoing dispatch details and confirmations.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Dispatch (Outgoing) tab content will appear here.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
