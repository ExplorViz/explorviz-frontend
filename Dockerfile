FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

ENV FRONTEND_IP=http://localhost:8090
ENV API_ROOT=change-API_ROOT

COPY entrypoint.sh /

COPY dist /usr/share/nginx/html
COPY explorviz-nginx.conf /etc/nginx/conf.d

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
