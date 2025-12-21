import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="text-center max-w-lg mx-auto">
          {/* Animated 404 */}
          <div className="relative mb-8">
            <h1 className="text-[120px] sm:text-[180px] font-bold text-primary/10 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-primary/10 rounded-full p-6 sm:p-8">
                <Search className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8 px-4">
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>

          {/* Attempted Path */}
          <p className="mt-8 text-sm text-muted-foreground">
            Attempted path: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
