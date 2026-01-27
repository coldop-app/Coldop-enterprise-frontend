import { createFileRoute, Link } from '@tanstack/react-router';

import LoginForm from '@/components/auth/login';

export const Route = createFileRoute('/store-admin/login/')({
  component: RouteComponent,
});

function RouteComponent() {
  const handleSubmit = (values: { mobileNumber: string; password: string }) => {
    console.log('Form submitted:', values);
    // TODO: Implement actual login logic
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-secondary/30 relative overflow-hidden px-4 sm:px-0">
      {/* Background pattern elements */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/5"></div>
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5"></div>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-primary/5"></div>
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-primary/10"></div>

        {/* Additional subtle pattern elements */}
        <div className="absolute top-1/2 left-1/4 w-20 h-20 rounded-full bg-primary/5"></div>
        <div className="absolute bottom-1/3 right-1/4 w-16 h-16 rounded-full bg-primary/5"></div>
        <div className="absolute top-1/3 right-1/5 w-24 h-24 rounded-full bg-primary/5"></div>

        {/* Decorative lines */}
        <div className="absolute top-20 left-1/2 w-[300px] h-px bg-primary/10 -rotate-45"></div>
        <div className="absolute bottom-20 right-1/2 w-[300px] h-px bg-primary/10 -rotate-45"></div>
      </div>

      {/* Logo - smaller on mobile */}
      <div className="fixed top-6 left-6 z-20">
        <Link
          to="/"
          className="flex items-center transition-transform duration-200 ease-in-out hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
        >
          <img
            src="/coldop-logo.webp"
            alt="Coldop Logo"
            className="w-12 sm:w-16"
          />
        </Link>
      </div>

      {/* Form Container - full width on mobile */}
      <div className="w-full sm:max-w-md z-10 py-8 sm:py-0">
        <LoginForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
