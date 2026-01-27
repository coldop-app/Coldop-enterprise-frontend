import { memo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required.')
    .regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .min(6, 'Password must be at least 6 characters.'),
});

interface LoginFormProps {
  onSubmit?: (values: { mobileNumber: string; password: string }) => void;
}

const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      mobileNumber: '',
      password: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit?.(value);
    },
  });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="font-custom text-2xl font-bold text-center">
          Login
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FieldGroup>
            <form.Field
              name="mobileNumber"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name} className="font-custom">
                      Mobile Number
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Enter your 10-digit mobile number"
                      autoComplete="tel"
                      className="font-custom"
                    />
                    {isInvalid && (
                      <FieldError
                        errors={
                          field.state.meta.errors as Array<
                            { message?: string } | undefined
                          >
                        }
                      />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="password"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name} className="font-custom">
                      Password
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type={showPassword ? 'text' : 'password'}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="font-custom pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded p-1"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {isInvalid && (
                      <FieldError
                        errors={
                          field.state.meta.errors as Array<
                            { message?: string } | undefined
                          >
                        }
                      />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="font-custom w-full"
          >
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default memo(LoginForm);
