import { motion } from "framer-motion";
import { Loader2, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProcessingIndicatorProps {
  status: "processing" | "completed" | "failed";
  progress?: number;
  message?: string;
  estimatedTime?: string;
}

export default function ProcessingIndicator({ 
  status, 
  progress = 0, 
  message = "Processing research...", 
  estimatedTime 
}: ProcessingIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "processing":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10";
      case "completed":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10";
      case "failed":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10";
    }
  };

  const pulseVariants = {
    initial: { scale: 1, opacity: 1 },
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const progressVariants = {
    initial: { width: 0 },
    animate: { 
      width: `${progress}%`,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${getStatusColor()} border-l-4 ${
        status === "processing" ? "border-l-blue-500" : 
        status === "completed" ? "border-l-green-500" : "border-l-red-500"
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <motion.div
              variants={status === "processing" ? pulseVariants : {}}
              initial="initial"
              animate={status === "processing" ? "animate" : "initial"}
            >
              {getStatusIcon()}
            </motion.div>
            
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  {message}
                </span>
                {estimatedTime && status === "processing" && (
                  <span className="text-xs text-muted-foreground">
                    ~{estimatedTime}
                  </span>
                )}
              </div>
              
              {status === "processing" && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(progress)}% complete</span>
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center space-x-1"
                    >
                      <Zap className="h-3 w-3" />
                      <span>AI analyzing...</span>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}