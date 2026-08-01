#!/bin/bash
docker run --rm -v $(pwd):/src -w /src semgrep/semgrep:1.163.0@sha256:7cad2bc2d1e44f87f0bf4be6d1fa23aa90fb72015bebc89fb91385d813987a03 semgrep --config "p/owasp-top-ten" --config "p/security-audit" --config "p/trailofbits" --config "p/github-actions" --error --metrics=off --exclude ./src/ --exclude ./api/ --exclude ./contents/ .
