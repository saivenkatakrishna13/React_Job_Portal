import React, { useContext } from 'react'
import {Context} from "../../main"

function Footer() {
  const {isAuthorized}  = useContext(Context)
  
  if (!isAuthorized) return null;

  return (
    <footer className="bg-gray-900 py-8 border-t border-gray-800 text-center mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="text-2xl font-extrabold text-white tracking-tight">
            Career<span className="text-blue-500">Connect</span>
          </div>
          <p className="text-gray-400 text-sm tracking-wide">
            &copy; {new Date().getFullYear()} CareerBridge. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer