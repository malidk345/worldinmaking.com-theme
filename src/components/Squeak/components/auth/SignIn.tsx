import React from 'react'
import WimAuthPortal from 'components/Auth/WimAuthPortal'

type SignInProps = {
    buttonText?: string
    onSubmit?: (user: any) => void
    setMessage?: React.Dispatch<React.SetStateAction<string | null>>
}

export const SignIn: React.FC<SignInProps> = ({ onSubmit }) => {
    return <WimAuthPortal onSuccess={() => onSubmit?.(null)} defaultTab="signin" />
}

export default SignIn
