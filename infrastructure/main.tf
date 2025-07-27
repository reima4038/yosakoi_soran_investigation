terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "yosakoi-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC設定
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "yosakoi-vpc"
    Environment = var.environment
  }
}

# インターネットゲートウェイ
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "yosakoi-igw"
    Environment = var.environment
  }
}

# パブリックサブネット
resource "aws_subnet" "public" {
  count = 2
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "yosakoi-public-subnet-${count.index + 1}"
    Environment = var.environment
  }
}

# プライベートサブネット
resource "aws_subnet" "private" {
  count = 2
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "yosakoi-private-subnet-${count.index + 1}"
    Environment = var.environment
  }
}

# NAT ゲートウェイ用 Elastic IP
resource "aws_eip" "nat" {
  count = 2
  domain = "vpc"

  tags = {
    Name = "yosakoi-nat-eip-${count.index + 1}"
    Environment = var.environment
  }
}

# NAT ゲートウェイ
resource "aws_nat_gateway" "main" {
  count = 2
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "yosakoi-nat-${count.index + 1}"
    Environment = var.environment
  }
}

# ルートテーブル（パブリック）
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "yosakoi-public-rt"
    Environment = var.environment
  }
}

# ルートテーブル（プライベート）
resource "aws_route_table" "private" {
  count = 2
  
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "yosakoi-private-rt-${count.index + 1}"
    Environment = var.environment
  }
}

# ルートテーブル関連付け
resource "aws_route_table_association" "public" {
  count = 2
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = 2
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# セキュリティグループ（ALB）
resource "aws_security_group" "alb" {
  name_prefix = "yosakoi-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "yosakoi-alb-sg"
    Environment = var.environment
  }
}

# セキュリティグループ（ECS）
resource "aws_security_group" "ecs" {
  name_prefix = "yosakoi-ecs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "yosakoi-ecs-sg"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "yosakoi-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Name = "yosakoi-alb"
    Environment = var.environment
  }
}

# ECS クラスター
resource "aws_ecs_cluster" "main" {
  name = "yosakoi-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "yosakoi-cluster"
    Environment = var.environment
  }
}

# RDS サブネットグループ
resource "aws_db_subnet_group" "main" {
  name       = "yosakoi-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "yosakoi-db-subnet-group"
    Environment = var.environment
  }
}

# ElastiCache サブネットグループ
resource "aws_elasticache_subnet_group" "main" {
  name       = "yosakoi-cache-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

data "aws_availability_zones" "available" {
  state = "available"
}