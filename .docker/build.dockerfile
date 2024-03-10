# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /app

# install with --production (exclude devDependencies)
RUN mkdir -p /tmp/prod
COPY package.json bun.lockb /tmp/prod/
RUN cd /tmp/prod && bun install --frozen-lockfile --production

# copy production dependencies and source code into final image
FROM base AS release
ARG version=development_build
COPY --from=base /tmp/prod/node_modules node_modules
COPY . .
RUN sed -i $(echo "s/1.0.0/$version/g") package.json

RUN ls -lahF
RUN cat package.json

# run the app
# USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "start" ]
