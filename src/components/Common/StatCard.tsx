import React from "react";
import { Card, CardContent } from "../ui/Card";

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) => {
  return (
    <Card
      className={`border-2 border-${color}-200 bg-gradient-to-br from-${color}-50 to-${color}-100`}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 sm:space-y-2">
            <p className={`text-xs sm:text-sm font-medium text-${color}-700`}>
              {title}
            </p>
            <p className={`text-2xl sm:text-3xl font-bold text-${color}-900`}>
              {value}
            </p>
          </div>
          <div className={`p-2 sm:p-3 bg-${color}-200 rounded-xl`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}-700`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
