module "eks" {
    source = "terraform-aws-modules/eks/aws"
    version = "~> 20.0"

    cluster_name    = var.cluster_name
    cluster_version = var.cluster_version

    vpc_id          = var.vpc_id
    subnet_ids      = var.private_subnets

    cluster_endpoint_private_access = true
    enable_cluster_creator_admin_permissions = true

    eks_managed_node_groups = {
        default = {
            instance_types = ["t3.medium"]

            min_size = 1
            max_size = 3
            desired_size = 2
            capacity_type = "ON_DEMAND"
        }
    }
}