FROM wordpress:5.2.3-php7.2-apache

RUN apt-get update && apt-get install -y wget unzip

# Install a vulnerable plugin (e.g., File Manager version 6.0)
RUN wget https://downloads.wordpress.org/plugin/wp-file-manager.6.0.zip -P /tmp/ \
    && unzip /tmp/wp-file-manager.6.0.zip -d /usr/src/wordpress/wp-content/plugins/ \
    && rm /tmp/wp-file-manager.6.0.zip

# Set permissions
RUN chown -R www-data:www-data /usr/src/wordpress/wp-content/plugins/

EXPOSE 80
