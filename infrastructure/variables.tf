variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "yosakoi-evaluation"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "yosakoi-eval.example.com"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "ecs_task_cpu" {
  description = "ECS task CPU units"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "ECS task memory (MB)"
  type        = number
  default     = 512
}

variable "min_capacity" {
  description = "Minimum number of ECS tasks"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum number of ECS tasks"
  type        = number
  default     = 10
}

variable "desired_capacity" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}