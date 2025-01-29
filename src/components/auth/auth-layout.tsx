import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReactNode } from 'react'

interface AuthLayoutProps {
    children: ReactNode
    title: string
    description: string
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center text-3xl font-extrabold text-gray-900">
                        {title}
                    </CardTitle>
                    <CardDescription className="text-center mt-2 text-sm text-gray-600">
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent>{children}</CardContent>
            </Card>
        </div>
    )
} 