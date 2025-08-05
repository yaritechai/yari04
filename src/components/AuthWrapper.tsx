import { useTheme } from "../contexts/ThemeContext";
import { SignInForm } from "../SignInForm";
import { User, Zap } from "lucide-react";

export function AuthWrapper() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen flex ${
      isDarkMode ? 'bg-black' : 'bg-white'
    }`}>
      {/* Left Side - Branding/Features */}
      <div className={`hidden lg:flex lg:w-1/2 xl:w-3/5 ${
        isDarkMode ? 'bg-white' : 'bg-black'
      } flex-col justify-center px-12`}>
        <div className="max-w-lg">
          {/* Logo/Brand */}
          <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/yari-logo.png" 
                alt="Yari AI Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className={`text-4xl font-bold ${
              isDarkMode ? 'text-black' : 'text-white'
            } mb-4`}>
              Welcome to Yari
            </h1>
            <p className={`text-xl ${
              isDarkMode ? 'text-black/70' : 'text-white/70'
            }`}>
              Your intelligent automation platform
            </p>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-xl ${
                isDarkMode ? 'bg-black' : 'bg-white'
              } flex items-center justify-center flex-shrink-0`}>
                <Zap className={`w-6 h-6 ${
                  isDarkMode ? 'text-white' : 'text-black'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${
                  isDarkMode ? 'text-black' : 'text-white'
                } mb-2`}>
                  Intelligent Automation
                </h3>
                <p className={`${
                  isDarkMode ? 'text-black/70' : 'text-white/70'
                }`}>
                  Build powerful workflows with AI-driven automation tools
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-xl ${
                isDarkMode ? 'bg-black' : 'bg-white'
              } flex items-center justify-center flex-shrink-0`}>
                <User className={`w-6 h-6 ${
                  isDarkMode ? 'text-white' : 'text-black'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${
                  isDarkMode ? 'text-black' : 'text-white'
                } mb-2`}>
                  Secure & Private
                </h3>
                <p className={`${
                  isDarkMode ? 'text-black/70' : 'text-white/70'
                }`}>
                  Enterprise-grade security with end-to-end encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className={`w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-8 py-12 ${
        isDarkMode ? 'bg-black' : 'bg-white'
      }`}>
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-12">
            <div className={`w-16 h-16 rounded-xl ${
              isDarkMode ? 'bg-white' : 'bg-black'
            } flex items-center justify-center mx-auto mb-6`}>
              <Shield className={`w-8 h-8 ${
                isDarkMode ? 'text-black' : 'text-white'
              }`} />
            </div>
            <h1 className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-black'
            } mb-2`}>
              Welcome to Yari
            </h1>
            <p className={`${
              isDarkMode ? 'text-white/70' : 'text-black/70'
            }`}>
              Sign in to continue
            </p>
          </div>

          {/* Auth Form */}
          <SignInForm />

          {/* Footer */}
          <div className="text-center mt-8">
            <p className={`text-sm ${
              isDarkMode ? 'text-white/50' : 'text-black/50'
            }`}>
              By continuing, you agree to our{" "}
              <button className={`font-medium underline ${
                isDarkMode ? 'text-white' : 'text-black'
              }`}>
                Terms of Service
              </button>{" "}
              and{" "}
              <button className={`font-medium underline ${
                isDarkMode ? 'text-white' : 'text-black'
              }`}>
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
