# Kubernetes failure demos

Run these only in a disposable cluster or an isolated namespace. The CPU demo
is capped at 250 millicores and 64 MiB of memory.

From the repository root, create the namespace and deploy one or more scenarios:

```sh
kubectl create namespace ai-devops-demo --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n ai-devops-demo -f demo-apps/crashing-app/crash-demo.yaml
kubectl apply -n ai-devops-demo -f demo-apps/oom-demo/oom-demo.yaml
kubectl apply -n ai-devops-demo -f demo-apps/cpu-stress/cpu-stress.yaml
```

Observe pod state and events:

```sh
kubectl get pods -n ai-devops-demo -w
kubectl get events -n ai-devops-demo --sort-by=.lastTimestamp
kubectl describe pod crash-demo -n ai-devops-demo
kubectl logs crash-demo -n ai-devops-demo --previous
kubectl describe pod oom-demo -n ai-devops-demo
kubectl top pod cpu-stress -n ai-devops-demo
```

Expected behavior:

- `crash-demo` repeatedly exits and enters `CrashLoopBackOff`.
- `oom-demo` exceeds its 50 MiB memory limit and is terminated for OOM.
- `cpu-stress` remains running while capped by its CPU and memory limits.

Remove the test workloads and namespace after validation:

```sh
kubectl delete namespace ai-devops-demo
```

The OOM image requires registry access. `kubectl top` also requires the Metrics
Server. These scenarios are manifests, not a substitute for running the
workload against a production cluster.
