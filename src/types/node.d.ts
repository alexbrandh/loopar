declare namespace NodeJS {
    interface ProcessEnv {
        [key: string]: string | undefined;
        NEXT_PUBLIC_SUPABASE_URL?: string;
        SUPABASE_SERVICE_ROLE_KEY?: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
        NODE_ENV?: 'development' | 'production' | 'test';
    }

    interface Process {
        env: ProcessEnv;
        cwd(): string;
    }
}
