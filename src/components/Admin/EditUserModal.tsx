import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/Dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Card, CardContent } from "../ui/Card";
import { Separator } from "../ui/Separator";
import { ImageCropper } from "../ui/ImageCropper";
import { User } from "../../types";
import Select from "react-select";
import {
  Loader2,
  Camera,
  Shield,
  ShieldOff,
  User as UserIcon,
  Mail,
  Settings,
  UserCheck,
  Timer,
  Crown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import toast from "react-hot-toast";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  users: User[];
  onUserUpdated: (userId: string, updates: Partial<User>) => void;
}

interface RoleOption {
  value: User["role"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ManagerOption {
  value: string;
  label: string;
  user: User;
}

export function EditUserModal({
  isOpen,
  onClose,
  user,
  users,
  onUserUpdated,
}: EditUserModalProps) {
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    role: user.role,
    managerId: user.managerId || "",
    isActive: user.isActive !== false,
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [profileImage, setProfileImage] = useState(user.photoURL || "");

  const managers = users.filter((u) => u.role === "manager");

  // Role options for react-select
  const roleOptions: RoleOption[] = [
    {
      value: "employee",
      label: "Employee",
      description: "No Access",
      icon: Timer,
    },
    {
      value: "manager",
      label: "Manager",
      description: "Review timesheets",
      icon: UserCheck,
    },
    {
      value: "admin",
      label: "Administrator",
      description: "Full system access",
      icon: Crown,
    },
  ];

  // Manager options for react-select
  const managerOptions: ManagerOption[] = managers.map((manager) => ({
    value: manager.id,
    label: manager.fullName,
    user: manager,
  }));

  // Get selected role option
  const selectedRoleOption = roleOptions.find(
    (option) => option.value === formData.role
  );

  // Get selected manager option
  const selectedManagerOption =
    managerOptions.find((option) => option.value === formData.managerId) ||
    null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: Partial<User> = {
        fullName: formData.fullName,
        role: formData.role as User["role"],
        managerId: formData.managerId || undefined,
        isActive: formData.isActive,
        photoURL: profileImage || undefined,
        updatedAt: new Date(),
      };

      await onUserUpdated(user.id, updates);
      onClose();
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageCropComplete = async (croppedImageFile: File) => {
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImageToCloudinary(croppedImageFile);
      setProfileImage(imageUrl);
      toast.success("Profile image updated successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleUserAccess = () => {
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4" />;
      case "manager":
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Timer className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-red-600 bg-red-50 border-red-200";
      case "manager":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // Custom option component for role select
  const CustomRoleOption = ({ data, ...props }: any) => (
    <div
      {...props.innerProps}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
    >
      <div className="p-2 bg-gray-100 rounded-lg">
        <data.icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{data.label}</div>
        <div className="text-sm text-gray-500">{data.description}</div>
      </div>
    </div>
  );

  // Custom single value component for role select
  const CustomRoleSingleValue = ({ data }: any) => (
    <div className="flex items-center gap-2">
      <data.icon className="w-4 h-4 text-gray-600" />
      <span className="font-medium">{data.label}</span>
    </div>
  );

  // Custom option component for manager select
  const CustomManagerOption = ({ data, ...props }: any) => (
    <div
      {...props.innerProps}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs">
          {data.user.fullName?.slice(0, 2).toUpperCase() ||
            data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{data.user.fullName}</div>
        <div className="text-sm text-gray-500">{data.user.email}</div>
      </div>
    </div>
  );

  // Custom single value component for manager select
  const CustomManagerSingleValue = ({ data }: any) => (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs">
          {data.user.fullName?.slice(0, 2).toUpperCase() ||
            data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{data.user.fullName}</span>
    </div>
  );

  // Custom styles for react-select
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: "40px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.1)" : "none",
      borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
      "&:hover": {
        borderColor: "#d1d5db",
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      padding: 0,
      backgroundColor: state.isSelected
        ? "#eff6ff"
        : state.isFocused
        ? "#f9fafb"
        : "white",
      color: "#111827",
      "&:hover": {
        backgroundColor: "#f3f4f6",
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "#111827",
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "#9ca3af",
    }),
    menu: (provided: any) => ({
      ...provided,
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow:
        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    }),
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-base">
              Manage user information, permissions, and profile settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Header Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Profile Image */}
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                      <AvatarImage src={profileImage} alt={user.fullName} />
                      <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {user.fullName?.slice(0, 2).toUpperCase() ||
                          user.email?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md border-2 border-background group-hover:scale-110 transition-transform"
                      onClick={() => setShowImageCropper(true)}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-center sm:text-left space-y-3">
                    <div>
                      <h3 className="text-xl font-semibold">{user.fullName}</h3>
                      <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </p>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <Badge className={`${getRoleColor(user.role)} border`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1 capitalize">{user.role}</span>
                      </Badge>
                      <Badge
                        variant={formData.isActive ? "default" : "destructive"}
                        className="border"
                      >
                        {formData.isActive ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {formData.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Access Control Section */}

              {/* Personal Information */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                    <h4 className="font-semibold">Personal Information</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-sm font-medium text-muted-foreground"
                      >
                        Email Address
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="bg-muted/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be modified
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="fullName" className="text-sm font-medium">
                        Full Name *
                      </label>
                      <Input
                        id="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        required
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Role & Permissions */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <h4 className="font-semibold">Role & Permissions</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">User Role *</label>
                      <Select
                        value={selectedRoleOption}
                        onChange={(option) =>
                          setFormData({
                            ...formData,
                            role: option?.value || "employee",
                          })
                        }
                        options={roleOptions}
                        components={{
                          Option: CustomRoleOption,
                          SingleValue: CustomRoleSingleValue,
                        }}
                        styles={customStyles}
                        placeholder="Select role..."
                        isSearchable={false}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                    </div>

                    {formData.role === "employee" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Assigned Manager
                        </label>
                        <Select
                          value={selectedManagerOption}
                          onChange={(option) =>
                            setFormData({
                              ...formData,
                              managerId: option?.value || "",
                            })
                          }
                          options={managerOptions}
                          components={{
                            Option: CustomManagerOption,
                            SingleValue: CustomManagerSingleValue,
                          }}
                          styles={customStyles}
                          placeholder="Select manager..."
                          isClearable
                          isSearchable
                          className="react-select-container"
                          classNamePrefix="react-select"
                          noOptionsMessage={() => "No managers available"}
                        />
                      </div>
                    )}
                  </div>

                  {/* Role Description */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {formData.role === "admin" &&
                        "Administrators have full system access including user management, system settings, and all data."}
                      {formData.role === "manager" &&
                        "Managers can oversee their assigned employees, review timesheets, and manage team activities."}
                      {formData.role === "employee" &&
                        "Employees have basic access to track time and submit timesheets for manager approval."}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-3 rounded-lg ${
                          formData.isActive ? "bg-green-50" : "bg-red-50"
                        }`}
                      >
                        {formData.isActive ? (
                          <Shield className="w-6 h-6 text-green-600" />
                        ) : (
                          <ShieldOff className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold">Account Access</h4>
                        <p className="text-sm text-muted-foreground">
                          {formData.isActive
                            ? "User has active system access"
                            : "User access has been revoked"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={formData.isActive ? "destructive" : "default"}
                      onClick={toggleUserAccess}
                      className="min-w-[120px]"
                    >
                      {formData.isActive ? "Revoke Access" : "Grant Access"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Profile"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropper
        isOpen={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        onCropComplete={handleImageCropComplete}
        aspectRatio={1}
      />
    </>
  );
}
