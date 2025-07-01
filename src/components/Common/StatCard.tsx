import React from "react";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'gray';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
}

const colorVariants = {
  blue: {
    bg: "from-blue-50 to-blue-100",
    border: "border-blue-200",
    icon: "bg-blue-100 text-blue-600",
    text: "text-blue-900",
    subtitle: "text-blue-700",
  },
  green: {
    bg: "from-emerald-50 to-emerald-100",
    border: "border-emerald-200",
    icon: "bg-emerald-100 text-emerald-600",
    text: "text-emerald-900",
    subtitle: "text-emerald-700",
  },
  red: {
    bg: "from-red-50 to-red-100",
    border: "border-red-200",
    icon: "bg-red-100 text-red-600",
    text: "text-red-900",
    subtitle: "text-red-700",
  },
  yellow: {
    bg: "from-amber-50 to-amber-100",
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-600",
    text: "text-amber-900",
    subtitle: "text-amber-700",
  },
  purple: {
    bg: "from-purple-50 to-purple-100",
    border: "border-purple-200",
    icon: "bg-purple-100 text-purple-600",
    text: "text-purple-900",
    subtitle: "text-purple-700",
  },
  orange: {
    bg: "from-orange-50 to-orange-100",
    border: "border-orange-200",
    icon: "bg-orange-100 text-orange-600",
    text: "text-orange-900",
    subtitle: "text-orange-700",
  },
  gray: {
    bg: "from-gray-50 to-gray-100",
    border: "border-gray-200",
    icon: "bg-gray-100 text-gray-600",
    text: "text-gray-900",
    subtitle: "text-gray-700",
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  subtitle,
  className,
}) => {
  const colors = colorVariants[color];

  return (
    <Card 
      variant="elevated" 
      className={cn(
        `bg-gradient-to-br ${colors.bg} border-2 ${colors.border} hover:shadow-medium transition-all duration-200`,
        className
      )}
    >
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className={cn("text-sm font-medium", colors.subtitle)}>
              {title}
            </p>
            <div className="space-y-1">
              <p className={cn("text-2xl lg:text-3xl font-bold", colors.text)}>
                {value}
              </p>
              {subtitle && (
                <p className={cn("text-xs", colors.subtitle)}>
                  {subtitle}
                </p>
              )}
            </div>
            {trend && (
              <Badge 
                variant={trend.isPositive ? "success" : "destructive"}
                size="sm"
                className="text-xs"
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </Badge>
            )}
          </div>
          <div className={cn(
            "flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-2xl shadow-soft",
            colors.icon
          )}>
            <Icon className="h-6 w-6 lg:h-7 lg:w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;