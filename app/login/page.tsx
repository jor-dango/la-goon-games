import LogInForm from '@/components/LogInForm'
import { AuthProvider } from '@/context/AuthProvider'
import React from 'react'

function SignIn() {
  return (
    <div className="w-full h-[100vh] flex justify-center items-center">
      <div className="max-w-[90%] flex flex-col gap-4 p-8 pb-0 border border-border rounded-2xl">
        <div>
          <h3>
            Log In
          </h3>
          <small className="text-textsecondary">
            This is just so we can keep track of who makes which challenges
          </small>
        </div>
        <LogInForm />
      </div>
    </div>
  )
}

export default SignIn