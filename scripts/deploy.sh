#!/bin/bash

set -e

# 設定
ENVIRONMENT=${1:-production}
REGION=${2:-ap-northeast-1}
APP_NAME="yosakoi-evaluation"

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# 環境変数の確認
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

# Docker イメージのビルドとプッシュ
echo "📦 Building and pushing Docker images..."
docker build -t $APP_NAME-backend:latest -f backend/Dockerfile.prod backend/
docker build -t $APP_NAME-frontend:latest -f frontend/Dockerfile.prod frontend/

# ECR にプッシュ（実際の実装では ECR URI を使用）
echo "📤 Pushing images to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
docker tag $APP_NAME-backend:latest $ECR_REGISTRY/$APP_NAME-backend:latest
docker tag $APP_NAME-frontend:latest $ECR_REGISTRY/$APP_NAME-frontend:latest
docker push $ECR_REGISTRY/$APP_NAME-backend:latest
docker push $ECR_REGISTRY/$APP_NAME-frontend:latest

# Terraform でインフラをデプロイ
echo "🏗️  Deploying infrastructure with Terraform..."
cd infrastructure
terraform init
terraform plan -var="environment=$ENVIRONMENT"
terraform apply -var="environment=$ENVIRONMENT" -auto-approve
cd ..

# ECS サービスの更新
echo "🔄 Updating ECS services..."
aws ecs update-service \
    --cluster $APP_NAME-cluster \
    --service $APP_NAME-backend-service \
    --force-new-deployment \
    --region $REGION

aws ecs update-service \
    --cluster $APP_NAME-cluster \
    --service $APP_NAME-frontend-service \
    --force-new-deployment \
    --region $REGION

# デプロイメントの完了を待機
echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
    --cluster $APP_NAME-cluster \
    --services $APP_NAME-backend-service $APP_NAME-frontend-service \
    --region $REGION

# ヘルスチェック
echo "🏥 Performing health check..."
LOAD_BALANCER_DNS=$(aws elbv2 describe-load-balancers \
    --names $APP_NAME-alb \
    --query 'LoadBalancers[0].DNSName' \
    --output text \
    --region $REGION)

for i in {1..30}; do
    if curl -f "http://$LOAD_BALANCER_DNS/health" > /dev/null 2>&1; then
        echo "✅ Health check passed!"
        break
    fi
    echo "⏳ Waiting for application to be ready... ($i/30)"
    sleep 10
done

if [ $i -eq 30 ]; then
    echo "❌ Health check failed after 5 minutes"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "🌐 Application URL: http://$LOAD_BALANCER_DNS"