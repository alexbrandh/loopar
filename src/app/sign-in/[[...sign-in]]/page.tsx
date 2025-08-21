import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <SignIn 
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary hover:bg-primary/90',
              card: 'shadow-lg border-0',
              headerTitle: 'text-2xl font-bold',
              headerSubtitle: 'text-muted-foreground',
            }
          }}
        />
      </div>
    </div>
  )
}